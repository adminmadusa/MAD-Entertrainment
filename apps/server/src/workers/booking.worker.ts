import * as Sentry from '@sentry/node';
import { Worker, WorkerOptions, Job } from 'bullmq';

import { getEnv } from '../config/env';
import { getQueueConnection, getQueueName, getQueuePrefix } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { Booking } from '../models/booking.schema';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { Event } from '../models/event.schema';
import { Ticket } from '../models/ticket.schema';
import { QueueService } from '../services/queue.service';
import { logger } from '../utils/logger';

const QUEUE_NAME = getQueueName('booking-queue');

export async function processBookingConfirm(bookingId: string): Promise<void> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  const event = await Event.findById(booking.eventId);
  if (!event) {
    throw new Error(`Event ${booking.eventId} not found for booking ${bookingId}`);
  }

  // 1. Generate scan-ready QR Tickets with idempotent upserts
  let ticketIndex = 1;
  if (!booking.tickets || !Array.isArray(booking.tickets)) {
    const fullBooking = await Booking.findById(booking._id).select('tickets');
    if (!fullBooking || !Array.isArray(fullBooking.tickets)) {
      throw new Error(`Booking ${bookingId} has no tickets array`);
    }
    booking.tickets = fullBooking.tickets;
  }

  // Mid-Flight Booking Protection: Verify and repair totalTickets if needed
  let expectedTotalTickets = 0;
  for (const t of booking.tickets) {
    const tierConfig = event.ticketTiers?.find((tc) => tc.tier === t.tier);
    expectedTotalTickets += t.quantity * (tierConfig?.groupSize || 1);
  }
  if (booking.totalTickets !== expectedTotalTickets) {
    booking.totalTickets = expectedTotalTickets;
    if (typeof Booking.updateOne === 'function') {
      await Booking.updateOne({ _id: booking._id }, { $set: { totalTickets: expectedTotalTickets } });
    }
  }

  for (const bookedTicket of booking.tickets) {
    if (event.bookingMode === 'seat_based' && bookedTicket.seats) {
      for (const seat of bookedTicket.seats) {
        const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
        const qrCodeText = ticketId;

        await Ticket.findOneAndUpdate(
          { ticketId },
          {
            $setOnInsert: {
              bookingId: booking._id,
              eventId: booking.eventId,
              tierName: bookedTicket.tierName,
              tier: bookedTicket.tier,
              admits: 1,
              seatId: seat.seatId,
              row: seat.row,
              seatNumber: seat.number,
              section: seat.section,
              qrCode: qrCodeText,
              qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
              assignmentStatus: 'unassigned',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ticketIndex++;
      }
    } else {
      // General admission - generate QRs matching count
      const tierConfig = event.ticketTiers?.find(t => t.tier === bookedTicket.tier);
      const groupSize = tierConfig?.groupSize || 1;
      const totalAdmissions = bookedTicket.quantity * groupSize;

      for (let i = 0; i < totalAdmissions; i++) {
        const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
        const qrCodeText = ticketId;

        await Ticket.findOneAndUpdate(
          { ticketId },
          {
            $setOnInsert: {
              bookingId: booking._id,
              eventId: booking.eventId,
              tierName: bookedTicket.tierName,
              tier: bookedTicket.tier,
              admits: 1,
              qrCode: qrCodeText,
              qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
              assignmentStatus: 'unassigned',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ticketIndex++;
      }
    }
  }

  // 3. Enqueue the next step: PDF generation
  await QueueService.enqueue(
    getQueueName('pdf-queue'),
    'pdf:generate',
    {
      bookingId: booking._id.toString(),
      eventId: event._id.toString(),
      recipientEmail: booking.guestEmail,
      guestName: booking.guestName,
    },
    `pdf:generate:${booking._id}`
  );

  logger.info({ bookingId }, 'Async ticket generation complete. Enqueued PDF generation task.');
}

// Handler mapping for both local fallback events and BullMQ worker jobs
async function handleJobExecution(jobId: string, data: any): Promise<void> {
  await Sentry.startSpan(
    {
      op: 'queue.process',
      name: `worker:${QUEUE_NAME}`,
    },
    async () => {
      if (!data.bookingId) {
        throw new Error('Missing bookingId in job payload');
      }
      await processBookingConfirm(data.bookingId);
    }
  );
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startBookingWorker(): void {
  if (!isRedisConnected()) {
    logger.warn('Redis offline. Booking worker startup aborted.');
    return;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
      prefix: getQueuePrefix(),
      concurrency: 20, // Strict concurrency bounds
    };

    worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info({ jobId: job.id }, 'Processing booking confirm job via BullMQ');
        await handleJobExecution(job.id || 'unknown', job.data);
      },
      options
    );

    worker.on('failed', async (job, err) => {
      logger.error({ err, jobId: job?.id }, 'Booking confirm job failed in BullMQ');
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
            queueName: QUEUE_NAME,
            attemptsMade: job.attemptsMade,
            dlqStatus: 'exhausted',
          }, 'Booking confirm job exhausted retries and moved to DLQ');
        }

        // 3. Sentry Notification
        try {
          Sentry.captureException(err, {
            tags: {
              queue: QUEUE_NAME,
              jobId: job.id || 'unknown',
              jobName: job.name || 'unknown',
              severity: 'error',
            },
            extra: {
              attemptsMade: job.attemptsMade,
              bookingId: job.data?.bookingId,
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

    logger.info('Booking Worker initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to start BullMQ Booking Worker. Degraded mode active.');
  }
}

export async function stopBookingWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
