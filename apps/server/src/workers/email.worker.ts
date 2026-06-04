import { Worker, WorkerOptions, Job } from 'bullmq';
import * as Sentry from '@sentry/node';
import { Types } from 'mongoose';

import { getQueueConnection, getQueueName, getQueuePrefix } from '../config/queue.config';
import { getEnv } from '../config/env';
import { isRedisConnected } from '../config/redis';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { Notification } from '../models/notification.schema';
import { createNotificationSafe } from '../services/notification.service';
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
  notificationType?: NotificationType,
  messageId?: string
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
    messageId,
  });

  // Notification DB log is handled at the handleJobExecution wrapper level.
  logger.info({ to, bookingId, type: notificationType }, 'Email successfully dispatched.');
}

export async function handleJobExecution(jobId: string, data: any, attemptsMade: number, queueName: string = QUEUE_NAME): Promise<void> {
  const { to, subject, html, attachments, bookingId, eventId, notificationType } = data;
  logger.info({ jobId, recipient: to, attemptsMade }, "Email worker started");

  if (!to || !subject || !html) {
    throw new Error('Missing parameters in email dispatch payload');
  }

  // 1. Retrieve or atomically initialize the notification document by jobId
  let notification = await Notification.findOne({ jobId });
  let isNew = false;

  if (!notification) {
    notification = await createNotificationSafe({
      jobId,
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
    });
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
          {
            status: 'processing',
            retryCount: { $lt: attemptsMade },
            updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5-minute lease
          }
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
  const messageId = `<${jobId}@mad-entertainment.com>`;

  try {
    await Sentry.startSpan(
      {
        op: 'queue.process',
        name: `worker:${queueName}`,
      },
      async () => {
        await processEmailDispatch(to, subject, html, attachments, bookingId, eventId, notificationType, messageId);
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
let marketingWorker: Worker | null = null;

const MARKETING_QUEUE_NAME = getQueueName('marketing-queue');

export function initEmailWorker(queueName: string, concurrency: number): Worker | null {
  if (!isRedisConnected()) {
    logger.warn(`Redis offline. Email worker startup for queue ${queueName} aborted.`);
    return null;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
      prefix: getQueuePrefix(),
      concurrency,
    };

    const newWorker = new Worker(
      queueName,
      async (job: Job) => {
        logger.info({ jobId: job.id, attemptsMade: job.attemptsMade, queue: queueName }, 'Processing email dispatch job via BullMQ');
        await handleJobExecution(job.id || 'unknown', job.data, job.attemptsMade, queueName);
      },
      options
    );

    newWorker.on('failed', async (job, err) => {
      logger.error({ err, jobId: job?.id, queue: queueName }, 'Email dispatch job failed in BullMQ');
      if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
        let dlqPersisted = false;

        // 1. DLQ Persistence
        try {
          await DeadLetterJob.create({
            queueName,
            jobId: job.id || 'unknown',
            jobName: job.name,
            data: job.data,
            failedReason: err.message,
            stacktrace: job.stacktrace,
            attemptsMade: job.attemptsMade,
          });
          dlqPersisted = true;
        } catch (dlqErr) {
          logger.error({ err: dlqErr, jobId: job.id, dlqStatus: 'failed_to_persist' }, 'Failed to persist Dead-Letter Queue document.');
        }

        // 2. Structured Logging
        if (dlqPersisted) {
          logger.error({
            jobId: job.id,
            bookingId: job.data?.bookingId,
            eventId: job.data?.eventId,
            queueName,
            attemptsMade: job.attemptsMade,
            dlqStatus: 'exhausted',
          }, 'Email dispatch job exhausted retries and moved to DLQ');
        }

        // 3. Sentry Notification
        try {
          Sentry.captureException(err, {
            tags: {
              queue: queueName,
              jobId: job.id || 'unknown',
              jobName: job.name || 'unknown',
              severity: 'warning',
            },
            extra: {
              attemptsMade: job.attemptsMade,
              bookingId: job.data?.bookingId,
              eventId: job.data?.eventId,
            },
            fingerprint: ['dlq-failure', queueName, err.message],
          });
        } catch (sentryError) {
          logger.error({ err: sentryError, originalErr: err.message, jobId: job.id }, 'Failed to emit exception to Sentry');
        }
      }
    });

    const env = getEnv();
    logger.info({
      appEnv: env.APP_ENV,
      queueName,
    }, "BullMQ queue initialized");

    logger.info(`Email Worker for queue ${queueName} initialized successfully`);
    return newWorker;
  } catch (err) {
    logger.error({ err, queueName }, `Failed to start BullMQ Email Worker for queue ${queueName}. Degraded mode active.`);
    return null;
  }
}

export function startEmailWorker(): void {
  // Start the transactional worker (notification-queue, concurrency 20)
  worker = initEmailWorker(QUEUE_NAME, 20);

  // Start the marketing worker (marketing-queue, concurrency 2)
  marketingWorker = initEmailWorker(MARKETING_QUEUE_NAME, 2);
}

export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (marketingWorker) {
    await marketingWorker.close();
    marketingWorker = null;
  }
}
