import { Worker, WorkerOptions, Job } from 'bullmq';
import * as Sentry from '@sentry/node';

import { getQueueConnection } from '../config/queue.config';
import { isRedisConnected } from '../config/redis';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Ticket } from '../models/ticket.schema';
import { DeadLetterJob } from '../models/dead-letter-job.schema';
import { QueueService, localFallbackEmitter } from '../services/queue.service';
import { logger } from '../utils/logger';

const QUEUE_NAME = 'booking-queue';

export async function processBookingConfirm(bookingId: string): Promise<void> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // 1. Idempotency Check: if tickets exist, skip creation
  const existingTicketsCount = await Ticket.countDocuments({ bookingId: booking._id });
  if (existingTicketsCount > 0) {
    logger.warn({ bookingId }, 'Idempotency guard triggered: tickets already exist for booking. Skipping.');
    return;
  }

  const event = await Event.findById(booking.eventId);
  if (!event) {
    throw new Error(`Event ${booking.eventId} not found for booking ${bookingId}`);
  }

  // 2. Generate scan-ready QR Tickets
  let ticketIndex = 1;
  for (const bookedTicket of booking.tickets) {
    if (event.bookingMode === 'seat_based' && bookedTicket.seats) {
      for (const seat of bookedTicket.seats) {
        const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
        const qrCodeText = JSON.stringify({
          ticketId,
          bookingId: booking._id.toString(),
          eventId: event._id.toString(),
          tier: bookedTicket.tier,
          seatId: seat.seatId,
          admits: 1,
        });

        await Ticket.create({
          ticketId,
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
          qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`,
        });
        ticketIndex++;
      }
    } else {
      // General admission - generate QRs matching count
      const tierConfig = event.ticketTiers?.find(t => t.tier === bookedTicket.tier);
      const admits = tierConfig?.groupSize || 1;

      for (let i = 0; i < bookedTicket.quantity; i++) {
        const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
        const qrCodeText = JSON.stringify({
          ticketId,
          bookingId: booking._id.toString(),
          eventId: booking.eventId.toString(),
          tier: bookedTicket.tier,
          admits,
        });

        await Ticket.create({
          ticketId,
          bookingId: booking._id,
          eventId: booking.eventId,
          tierName: bookedTicket.tierName,
          tier: bookedTicket.tier,
          admits,
          qrCode: qrCodeText,
          qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`,
        });
        ticketIndex++;
      }
    }
  }

  // 3. Enqueue the next step: PDF generation
  await QueueService.enqueue(
    'pdf-queue',
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
  // Bind local fallback event listener immediately
  localFallbackEmitter.on(QUEUE_NAME, async (job) => {
    logger.info({ jobId: job.id }, 'Processing booking confirm job via local EventEmitter fallback');
    try {
      await handleJobExecution(job.id, job.data);
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'Local booking confirm job fallback execution failed');
    }
  });

  if (!isRedisConnected()) {
    logger.warn('Redis offline. Operating booking worker in in-memory degraded fallback mode.');
    return;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
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
        // Send to Dead-Letter Queue (persistent DB storage)
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
          logger.warn({ jobId: job.id }, 'Job moved to Dead-Letter Queue database collection.');
        } catch (dlqErr) {
          logger.error({ err: dlqErr, jobId: job.id }, 'Failed to persist Dead-Letter Queue document.');
        }
      }
    });

    logger.info('Booking Worker initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to start BullMQ Booking Worker. Degraded mode active.');
  }
}

export async function stopBookingWorker(): Promise<void> {
  localFallbackEmitter.removeAllListeners(QUEUE_NAME);
  if (worker) {
    await worker.close();
    worker = null;
  }
}
