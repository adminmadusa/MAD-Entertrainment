import { Worker, WorkerOptions, Job } from 'bullmq';
import * as Sentry from '@sentry/node';

import { getQueueConnection, getQueueName, getQueuePrefix } from '../config/queue.config';
import { getEnv } from '../config/env';
import { isRedisConnected } from '../config/redis';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { Notification } from '../models/notification.schema';
import { QueueService } from '../services/queue.service';
import { createNotificationSafe } from '../services/notification.service';
import { generateTicketPDF } from '../utils/pdf';
import { NotificationType } from '@mad/shared';
import { logger } from '../utils/logger';

const QUEUE_NAME = getQueueName('pdf-queue');

export async function processPDFGenerate(
  bookingId: string,
  eventId: string,
  recipientEmail: string,
  guestName: string,
  isResend?: boolean,
  resendId?: string
): Promise<void> {
  const booking = await Booking.findById(bookingId);
  const event = await Event.findById(eventId);

  if (!booking || !event) {
    throw new Error(`Booking ${bookingId} or Event ${eventId} not found for PDF generation`);
  }

  const jobId = isResend && resendId
    ? `email-dispatch-${booking._id}-resend-${resendId}`
    : `email-dispatch-${booking._id}`;

  // Read-only early exit to prevent generating PDF if already successfully sent
  const existingNotification = await Notification.findOne({ jobId });
  if (existingNotification && (existingNotification.status === 'sent' || existingNotification.isSent)) {
    logger.warn(
      { bookingId: booking._id, jobId },
      'Idempotency guard triggered: PDF Ticket already generated and email successfully sent. Skipping duplicate execution.'
    );
    return;
  }

  // 1. Generate PDF buffer in memory
  const pdfBuffer = await generateTicketPDF(booking, event);

  const env = getEnv();
  // Strip trailing slashes to ensure clean URL construction
  const rawUrl = env.FRONTEND_URL || env.ALLOWED_ORIGINS.split(',')[0].trim();
  const frontendUrl = rawUrl.replace(/\/+$/, '');

  const ticketUrl = `${frontendUrl}/tickets?ref=${booking.bookingId}`;
  const manageTicketsUrl = `${frontendUrl}/tickets`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
      <h2>Hi ${booking.guestName},</h2>
      <p>Your booking <strong>${booking.bookingId}</strong> for the event <strong>"${event.title || 'MAD Event'}"</strong> has been successfully confirmed!</p>
      <p>Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${ticketUrl}" style="background-color: #8B5CF6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 10px;">View Ticket Online</a>
        <br/>
        <a href="${manageTicketsUrl}" style="color: #8B5CF6; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; margin-top: 10px;">Manage My Tickets</a>
      </div>

      <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center;">
        <p style="margin: 0 0 5px 0;">If the buttons don't work, copy and paste this link:</p>
        <a href="${ticketUrl}" style="color: #6b7280; word-break: break-all;">${ticketUrl}</a>
      </div>

      <p>Enjoy the show!</p>
      <br/>
      <p>MAD Entertainment Team</p>
    </div>
  `;



  // Unify notification creation under createNotificationSafe
  const notification = await createNotificationSafe({
    jobId,
    type: NotificationType.BOOKING_CONFIRMED,
    bookingId: booking._id,
    eventId: event._id,
    channel: 'email',
    recipient: recipientEmail,
    subject: `Your Ticket for ${event.title || 'MAD Event'} [${booking.bookingId}]`,
    status: 'queued',
    isSent: false,
    retryCount: 0,
    queuedAt: new Date(),
  });

  // If the notification was already processed successfully, exit early
  if (notification.status === 'sent' || notification.isSent) {
    logger.warn(
      { bookingId: booking._id, jobId },
      'Idempotency guard triggered: PDF Ticket already generated and email successfully sent. Skipping duplicate execution.'
    );
    return;
  }

  // 2. Enqueue the final notification task with the base64-encoded attachment
  await QueueService.enqueue(
    getQueueName('notification-queue'),
    'email:dispatch',
    {
      to: recipientEmail,
      subject: `Your Ticket for ${event.title || 'MAD Event'} [${booking.bookingId}]`,
      html: emailBody,
      attachments: [
        {
          filename: `MAD_Ticket_${booking.bookingId}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
      bookingId: booking._id.toString(),
      eventId: event._id.toString(),
      notificationType: NotificationType.BOOKING_CONFIRMED,
    },
    jobId
  );

  logger.info({ bookingId }, 'PDF Ticket compiled successfully and enqueued SMTP dispatch.');
}

async function handleJobExecution(jobId: string, data: any): Promise<void> {
  await Sentry.startSpan(
    {
      op: 'queue.process',
      name: `worker:${QUEUE_NAME}`,
    },
    async () => {
      const { bookingId, eventId, recipientEmail, guestName, isResend, resendId } = data;
      if (!bookingId || !eventId || !recipientEmail || !guestName) {
        throw new Error('Missing parameters in PDF generation payload');
      }

      await processPDFGenerate(bookingId, eventId, recipientEmail, guestName, isResend, resendId);
    }
  );
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startPDFWorker(): void {
  if (!isRedisConnected()) {
    logger.warn('Redis offline. PDF worker startup aborted.');
    return;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
      prefix: getQueuePrefix(),
      concurrency: 5, // Strict low concurrency bounds to prevent CPU pool starvation
    };

    worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info({ jobId: job.id }, 'Processing PDF generation job via BullMQ');
        await handleJobExecution(job.id || 'unknown', job.data);
      },
      options
    );

    worker.on('failed', async (job, err) => {
      logger.error({ err, jobId: job?.id }, 'PDF generation job failed in BullMQ');
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        let dlqPersisted = false;

        // 1. DLQ Persistence
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
            queueName: QUEUE_NAME,
            attemptsMade: job.attemptsMade,
            dlqStatus: 'exhausted',
          }, 'PDF generation job exhausted retries and moved to DLQ');
        }

        // 3. Sentry Notification
        try {
          Sentry.captureException(err, {
            tags: {
              queue: QUEUE_NAME,
              jobId: job.id || 'unknown',
              jobName: job.name || 'unknown',
              severity: 'warning',
            },
            extra: {
              attemptsMade: job.attemptsMade,
              bookingId: job.data?.bookingId,
              eventId: job.data?.eventId,
            },
            fingerprint: ['dlq-failure', QUEUE_NAME, err.message],
          });
        } catch (sentryError) {
          logger.error({ err: sentryError, originalErr: err.message, jobId: job.id }, 'Failed to emit exception to Sentry');
        }
      }
    });

    const env = getEnv();
    logger.info({
      appEnv: env.APP_ENV,
      queueName: QUEUE_NAME,
    }, "BullMQ queue initialized");

    logger.info('PDF Worker initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to start BullMQ PDF Worker. Degraded mode active.');
  }
}

export async function stopPDFWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
