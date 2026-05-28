import { Worker, WorkerOptions, Job } from "bullmq";
import * as Sentry from "@sentry/node";

import { getQueueConnection } from "../config/queue.config";
import { isRedisConnected } from "../config/redis";
import { Booking } from "../models/booking.schema";
import { Event } from "../models/event.schema";
import { DeadLetterJob } from "../models/dead-letter-job.schema";
import { QueueService, localFallbackEmitter } from "../services/queue.service";
import { generateTicketPDF } from "../utils/pdf";
import { bookingConfirmationHtml } from "../lib/email";
import { logger } from "../utils/logger";

const QUEUE_NAME = "pdf-queue";

export async function processPDFGenerate(
  bookingId: string,
  eventId: string,
  recipientEmail: string,
  guestName: string,
): Promise<void> {
  const booking = await Booking.findById(bookingId);
  const event = await Event.findById(eventId);

  if (!booking || !event) {
    throw new Error(
      `Booking ${bookingId} or Event ${eventId} not found for PDF generation`,
    );
  }

  // 1. Generate PDF buffer in memory
  const pdfBuffer = await generateTicketPDF(booking, event);

  const formattedDate = new Date(
    event.startDate || booking.createdAt,
  ).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const emailBody = await bookingConfirmationHtml({
    customerName: booking.guestName,
    eventTitle: event.title || "MAD Event",
    bookingReference: booking.bookingId,
    eventDate: formattedDate,
    tickets: booking.tickets.map((t) => ({
      tierName: t.tierName,
      quantity: t.quantity,
      price: t.pricePerTicket,
    })),
    totalAmount: booking.totalAmount,
    currency: booking.currency || "INR",
  });

  // 2. Enqueue the final notification task with the base64-encoded attachment
  await QueueService.enqueue(
    "notification-queue",
    "email:dispatch",
    {
      to: recipientEmail,
      subject: `Your Ticket for ${event.title || "MAD Event"} [${booking.bookingId}]`,
      html: emailBody,
      attachments: [
        {
          filename: `MAD_Ticket_${booking.bookingId}.pdf`,
          content: pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
      bookingId: booking._id.toString(),
      eventId: event._id.toString(),
    },
    `email:dispatch:${booking._id}`,
  );

  logger.info(
    { bookingId },
    "PDF Ticket compiled successfully and enqueued SMTP dispatch.",
  );
}

async function handleJobExecution(jobId: string, data: any): Promise<void> {
  await Sentry.startSpan(
    {
      op: "queue.process",
      name: `worker:${QUEUE_NAME}`,
    },
    async () => {
      const { bookingId, eventId, recipientEmail, guestName } = data;
      if (!bookingId || !eventId || !recipientEmail || !guestName) {
        throw new Error("Missing parameters in PDF generation payload");
      }

      await processPDFGenerate(bookingId, eventId, recipientEmail, guestName);
    },
  );
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startPDFWorker(): void {
  // Bind local fallback event listener immediately
  localFallbackEmitter.on(QUEUE_NAME, async (job) => {
    logger.info(
      { jobId: job.id },
      "Processing PDF generation job via local EventEmitter fallback",
    );
    try {
      await handleJobExecution(job.id, job.data);
    } catch (err) {
      logger.error(
        { err, jobId: job.id },
        "Local PDF generation job fallback execution failed",
      );
    }
  });

  if (!isRedisConnected()) {
    logger.warn(
      "Redis offline. Operating PDF worker in in-memory degraded fallback mode.",
    );
    return;
  }

  try {
    const connection = getQueueConnection();
    const options: WorkerOptions = {
      connection,
      concurrency: 5, // Strict low concurrency bounds to prevent CPU pool starvation
    };

    worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        logger.info(
          { jobId: job.id },
          "Processing PDF generation job via BullMQ",
        );
        await handleJobExecution(job.id || "unknown", job.data);
      },
      options,
    );

    worker.on("failed", async (job, err) => {
      logger.error(
        { err, jobId: job?.id },
        "PDF generation job failed in BullMQ",
      );
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        try {
          await DeadLetterJob.create({
            queueName: QUEUE_NAME,
            jobId: job.id || "unknown",
            jobName: job.name,
            data: job.data,
            failedReason: err.message,
            stacktrace: job.stacktrace,
            attemptsMade: job.attemptsMade,
          });
          logger.warn(
            { jobId: job.id },
            "PDF Job moved to Dead-Letter Queue database collection.",
          );
        } catch (dlqErr) {
          logger.error(
            { err: dlqErr, jobId: job.id },
            "Failed to persist Dead-Letter Queue document.",
          );
        }
      }
    });

    logger.info("PDF Worker initialized successfully");
  } catch (err) {
    logger.error(
      { err },
      "Failed to start BullMQ PDF Worker. Degraded mode active.",
    );
  }
}

export async function stopPDFWorker(): Promise<void> {
  localFallbackEmitter.removeAllListeners(QUEUE_NAME);
  if (worker) {
    await worker.close();
    worker = null;
  }
}
