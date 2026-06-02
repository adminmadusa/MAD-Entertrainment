import { Worker, WorkerOptions, Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { Types } from 'mongoose';

import { getQueueConnection, getQueueName, getQueuePrefix } from '../config/queue.config';
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

  // Notification DB log is handled at the handleJobExecution wrapper level.
  logger.info({ to, bookingId, type: notificationType }, 'Email successfully dispatched.');
}

export async function handleJobExecution(jobId: string, data: any, attemptsMade: number): Promise<void> {
  const { to, subject, html, attachments, bookingId, eventId, notificationType } = data;
  logger.info({ jobId, recipient: to, attemptsMade }, "Email worker started");

  if (!to || !subject || !html) {
    throw new Error('Missing parameters in email dispatch payload');
  }

  // 1. Retrieve or atomically initialize the notification document by jobId
  let notification = await Notification.findOne({ jobId });
  let isNew = false;

  if (!notification) {
    notification = await Notification.findOneAndUpdate(
      { jobId },
      {
        $setOnInsert: {
          type: notificationType || NotificationType.BOOKING_CONFIRMED,
          bookingId,
          eventId,
          channel: 'email',
          recipient: to,
          subject,
          status: 'processing',
          isSent: false,
          retryCount: attemptsMade,
          queuedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    isNew = true;
  }

  if (!isNew) {
    // Check if already sent
    if (notification.status === 'sent' || notification.isSent) {
      logger.warn(
        { jobId },
        'Idempotency guard triggered: Email already sent. Skipping execution.'
      );
      return;
    }

    // Check if concurrent processing is happening on first attempt
    if (notification.status === 'processing' && attemptsMade === 0) {
      logger.warn(
        { jobId },
        'Idempotency guard triggered: Email is already being processed. Skipping execution.'
      );
      return;
    }

    // Atomically transition status to processing
    const updatedNotification = await Notification.findOneAndUpdate(
      {
        _id: notification._id,
        $or: [
          { status: { $in: ['queued', 'failed'] } },
          { status: 'processing', retryCount: { $lt: attemptsMade } }
        ]
      },
      {
        $set: {
          status: 'processing',
          retryCount: attemptsMade,
        },
      },
      { new: true }
    );

    if (!updatedNotification) {
      logger.warn(
        { jobId },
        'Idempotency guard triggered: Notification status changed concurrently. Skipping execution.'
      );
      return;
    }
  }

  // 2. Dispatch SMTP email inside Sentry span
  try {
    await Sentry.startSpan(
      {
        op: 'queue.process',
        name: `worker:${QUEUE_NAME}`,
      },
      async () => {
        await processEmailDispatch(to, subject, html, attachments, bookingId, eventId, notificationType);
      }
    );
    
    await Notification.updateOne({ jobId }, { 
      $set: { status: 'sent', processedAt: new Date(), isSent: true } 
    });
  } catch (err: any) {
    await Notification.updateOne({ jobId }, { 
      $set: { 
        status: 'failed', 
        errorMessage: err.message, 
        processedAt: new Date(),
        retryCount: attemptsMade
      }
    });
    throw err;
  }
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startEmailWorker(): void {
  // Bind local fallback event listener immediately
  localFallbackEmitter.on(QUEUE_NAME, async (job) => {
    logger.info({ jobId: job.id }, 'Processing email dispatch job via local EventEmitter fallback');
    try {
      await handleJobExecution(job.id, job.data, 0);
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
      prefix: getQueuePrefix(),
      concurrency: 20, // Standard concurrency limits
    };

    worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info({ jobId: job.id, attemptsMade: job.attemptsMade }, 'Processing email dispatch job via BullMQ');
        await handleJobExecution(job.id || 'unknown', job.data, job.attemptsMade);
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
