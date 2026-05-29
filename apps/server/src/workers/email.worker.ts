import { Worker, WorkerOptions, Job } from "bullmq";
import * as Sentry from "@sentry/node";
import { Types } from "mongoose";

import { getQueueConnection } from "../config/queue.config";
import { isRedisConnected } from "../config/redis";
import { DeadLetterJob } from "../models/dead-letter-job.schema";
import { Notification } from "../models/notification.schema";
import { localFallbackEmitter } from "../services/queue.service";
import { sendEmail } from "../lib/email/send-email"; // Direct import to receive SendEmailResult
import { logger } from "../utils/logger";
import { NotificationType } from "@mad/shared";

const QUEUE_NAME = "notification-queue";

/**
 * Helper to classify SMTP error messages into permanent vs transient categories.
 */
function isPermanentSMTPError(errorMsg: string): boolean {
  const msg = errorMsg.toLowerCase();
  return (
    msg.includes("invalid email") ||
    msg.includes("malformed") ||
    msg.includes("syntax error") ||
    msg.includes("blocked") ||
    msg.includes("domain rejection") ||
    msg.includes("hard bounce") ||
    msg.includes("550") ||
    msg.includes("553") ||
    msg.includes("501")
  );
}

export async function processEmailDispatch(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string; contentType?: string }[],
  bookingId?: string,
  eventId?: string,
): Promise<void> {
  console.log("[EMAIL WORKER] Processing booking:", bookingId);

  // 1. Idempotency Guard - Avoid duplicate confirmation sends on job retries
  if (bookingId) {
    const existingSuccess = await Notification.findOne({
      bookingId: new Types.ObjectId(bookingId),
      type: NotificationType.BOOKING_CONFIRMED,
      isSent: true,
    });
    if (existingSuccess) {
      console.log(
        "[EMAIL IDEMPOTENCY] Email already successfully sent for booking:",
        bookingId,
      );
      logger.info(
        { bookingId },
        "Email already successfully sent in a previous attempt, skipping duplicate dispatch.",
      );
      return;
    }
  }

  // 2. Decode base64 attachments back into Buffer instances
  const parsedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content, "base64"),
    contentType: att.contentType,
  }));

  // 3. Dispatch the SMTP email
  const result = await sendEmail({
    to,
    subject,
    html,
    attachments: parsedAttachments,
  });

  if (result.ok === false) {
    const errorMsg = result.error || "Unknown SMTP delivery error";

    // 4. Classify SMTP errors
    if (isPermanentSMTPError(errorMsg)) {
      console.error("[EMAIL PERMANENT FAILURE] Bypassing retries:", errorMsg);

      // Save permanently failed notification to MongoDB
      await Notification.create({
        type: NotificationType.BOOKING_CONFIRMED,
        bookingId: bookingId ? new Types.ObjectId(bookingId) : undefined,
        eventId: eventId ? new Types.ObjectId(eventId) : undefined,
        channel: "email",
        recipient: to,
        subject: subject,
        body: `Permanently failed: ${errorMsg}`,
        isSent: false,
        retryCount: 0,
      });
      return; // Handled cleanly, no re-throw so BullMQ completes job
    } else {
      console.error("[EMAIL TRANSIENT FAILURE] Scheduling retry:", errorMsg);
      throw new Error(errorMsg); // Re-throw to trigger BullMQ retry backoff!
    }
  }

  // 5. Save Notification confirmation document to MongoDB
  await Notification.create({
    type: NotificationType.BOOKING_CONFIRMED,
    bookingId: bookingId ? new Types.ObjectId(bookingId) : undefined,
    eventId: eventId ? new Types.ObjectId(eventId) : undefined,
    channel: "email",
    recipient: to,
    subject: subject,
    body: "Email dispatched asynchronously with PDF ticket attached.",
    isSent: true,
    retryCount: 0,
  });

  logger.info(
    { to, bookingId },
    "Email receipt successfully dispatched and logged in database.",
  );
}

async function handleJobExecution(jobId: string, data: any): Promise<void> {
  await Sentry.startSpan(
    {
      op: "queue.process",
      name: `worker:${QUEUE_NAME}`,
    },
    async () => {
      const { to, subject, html, attachments, bookingId, eventId } = data;
      if (!to || !subject || !html) {
        throw new Error("Missing parameters in email dispatch payload");
      }

      await processEmailDispatch(
        to,
        subject,
        html,
        attachments,
        bookingId,
        eventId,
      );
    },
  );
}

// ─── BullMQ Worker Setup ─────────────────────────────────────
let worker: Worker | null = null;

export function startEmailWorker(): void {
  // Bind local fallback event listener immediately
  localFallbackEmitter.on(QUEUE_NAME, async (job) => {
    logger.info(
      { jobId: job.id },
      "Processing email dispatch job via local EventEmitter fallback",
    );
    try {
      await handleJobExecution(job.id, job.data);
    } catch (err) {
      logger.error(
        { err, jobId: job.id },
        "Local email dispatch job fallback execution failed",
      );
    }
  });

  if (!isRedisConnected()) {
    logger.warn(
      "Redis offline. Operating email worker in in-memory degraded fallback mode.",
    );
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
        logger.info(
          { jobId: job.id },
          "Processing email dispatch job via BullMQ",
        );
        if (job.attemptsMade > 0) {
          console.log("[EMAIL RETRY]", { attempt: job.attemptsMade });
        }
        await handleJobExecution(job.id || "unknown", job.data);
      },
      options,
    );

    worker.on("failed", async (job, err) => {
      console.error("[QUEUE FAILED]", job?.id, err);
      logger.error(
        { err, jobId: job?.id },
        "Email dispatch job failed in BullMQ",
      );
      if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
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
            "Email Job moved to Dead-Letter Queue database collection.",
          );
        } catch (dlqErr) {
          logger.error(
            { err: dlqErr, jobId: job.id },
            "Failed to persist Dead-Letter Queue document.",
          );
        }
      }
    });

    logger.info("Email Worker initialized successfully");
  } catch (err) {
    logger.error(
      { err },
      "Failed to start BullMQ Email Worker. Degraded mode active.",
    );
  }
}

export async function stopEmailWorker(): Promise<void> {
  localFallbackEmitter.removeAllListeners(QUEUE_NAME);
  if (worker) {
    await worker.close();
    worker = null;
  }
}
