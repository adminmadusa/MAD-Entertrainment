import { Worker, WorkerOptions, Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { Types } from 'mongoose';

import { getQueueConnection, getQueueName } from '../config/queue.config';
import { getEnv } from '../config/env';
import { isRedisConnected } from '../config/redis';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { Notification } from '../models/notification.schema';
import { localFallbackEmitter } from '../services/queue.service';
import { sendEmail } from '../utils/email';
import { logger } from '../utils/logger';
import { NotificationType } from '@mad/shared';

const QUEUE_NAME = getQueueName('notification-queue');

export async function processEmailDispatch(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string; contentType?: string }[],
  bookingId?: string,
  eventId?: string,
  notificationType?: NotificationType
): Promise<void> {
  // 1. Decode base64 attachments back into Buffer instances
  const parsedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64'),
    contentType: att.contentType,
  }));

  // 2. Dispatch the SMTP email
  await sendEmail({
    to,
    subject,
    html,
    attachments: parsedAttachments,
  });

  // 3. Save Notification confirmation document to MongoDB
  await Notification.create({
    type: notificationType ?? NotificationType.BOOKING_CONFIRMED,
    bookingId: bookingId ? new Types.ObjectId(bookingId) : undefined,
    eventId: eventId ? new Types.ObjectId(eventId) : undefined,
    channel: 'email',
    recipient: to,
    subject: subject,
    body: notificationType === NotificationType.OTP 
      ? 'Magic Link login email with OTP fallback dispatched asynchronously.'
      : 'Email dispatched asynchronously with PDF ticket attached.',
    isSent: true,
    retryCount: 0,
  });

  logger.info({ to, bookingId, type: notificationType }, 'Email successfully dispatched and logged in database.');
}

async function handleJobExecution(jobId: string, data: any): Promise<void> {
  const { to: email } = data;
  logger.info({ jobId, email }, "Email worker started");
  await Sentry.startSpan(
    {
      op: 'queue.process',
      name: `worker:${QUEUE_NAME}`,
    },
    async () => {
      const { to, subject, html, attachments, bookingId, eventId, notificationType } = data;
      if (!to || !subject || !html) {
        throw new Error('Missing parameters in email dispatch payload');
      }

      await processEmailDispatch(to, subject, html, attachments, bookingId, eventId, notificationType);
    }
  );
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startEmailWorker(): void {
  // Bind local fallback event listener immediately
  localFallbackEmitter.on(QUEUE_NAME, async (job) => {
    logger.info({ jobId: job.id }, 'Processing email dispatch job via local EventEmitter fallback');
    try {
      await handleJobExecution(job.id, job.data);
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'Local email dispatch job fallback execution failed');
    }
  });

  if (!isRedisConnected()) {
    logger.warn('Redis offline. Operating email worker in in-memory degraded fallback mode.');
    return;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
      concurrency: 20, // Standard concurrency limits
    };

    worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info({ jobId: job.id }, 'Processing email dispatch job via BullMQ');
        await handleJobExecution(job.id || 'unknown', job.data);
      },
      options
    );

    worker.on('failed', async (job, err) => {
      logger.error({ err, jobId: job?.id }, 'Email dispatch job failed in BullMQ');
      if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
        try {
          await DeadLetterJob.create({
            queueName: QUEUE_NAME,
            jobId: job.id || 'unknown',
            jobName: job.name,
            data: job.data,
            failedReason: err.message,
            stacktrace: job.stacktrace,
            attemptsMade: job.attemptsMade,
          });
          logger.warn({ jobId: job.id }, 'Email Job moved to Dead-Letter Queue database collection.');
        } catch (dlqErr) {
          logger.error({ err: dlqErr, jobId: job.id }, 'Failed to persist Dead-Letter Queue document.');
        }
      }
    });

    const env = getEnv();
    logger.info({
      appEnv: env.APP_ENV,
      queueName: QUEUE_NAME,
    }, "BullMQ queue initialized");

    logger.info('Email Worker initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to start BullMQ Email Worker. Degraded mode active.');
  }
}

export async function stopEmailWorker(): Promise<void> {
  localFallbackEmitter.removeAllListeners(QUEUE_NAME);
  if (worker) {
    await worker.close();
    worker = null;
  }
}
