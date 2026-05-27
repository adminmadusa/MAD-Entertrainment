import { ClientSession } from "mongoose";

import { getEnv } from "../config/env";
import {
  IOutboxEvent,
  OutboxEvent,
  OutboxEventType,
} from "../models/outbox-event.schema";
import {
  OutboxPayloadByType,
  OutboxTypedEventType,
} from "../types/outbox-events";

const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

type EnqueueInput<K extends OutboxTypedEventType = OutboxTypedEventType> = {
  aggregateType: string;
  aggregateId: string;
  eventType: K;
  payload: OutboxPayloadByType[K];
  payloadVersion?: number;
  availableAt?: Date;
  maxAttempts?: number;
};

export class OutboxEventService {
  static async enqueueMany(
    events: EnqueueInput[],
    session?: ClientSession,
  ): Promise<void> {
    if (events.length === 0) return;
    const docs = events.map((event) => ({
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventType: event.eventType as OutboxEventType,
      // Keep persistence boundary broad for now; typed contracts are enforced at enqueue call sites.
      payload: event.payload as unknown as Record<string, unknown>,
      payloadVersion: event.payloadVersion ?? 1,
      status: "PENDING" as const,
      attempts: 0,
      maxAttempts: event.maxAttempts ?? getEnv().OUTBOX_MAX_ATTEMPTS,
      availableAt: event.availableAt ?? new Date(),
      deadLetterEligible: false,
    }));
    await OutboxEvent.insertMany(docs, { session });
  }

  static async claimNextBatch(limit = 20): Promise<IOutboxEvent[]> {
    const claimed: IOutboxEvent[] = [];
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - getEnv().OUTBOX_STALE_LOCK_MS);

    for (let i = 0; i < limit; i++) {
      const doc = await OutboxEvent.findOneAndUpdate(
        {
          $or: [
            { status: "PENDING", availableAt: { $lte: now } },
            { status: "FAILED", availableAt: { $lte: now } },
            {
              status: "PROCESSING",
              processingHeartbeatAt: { $lte: staleCutoff },
            },
          ],
          deadLetterEligible: { $ne: true },
        },
        {
          $set: {
            status: "PROCESSING",
            processingStartedAt: now,
            processingHeartbeatAt: now,
          },
          $inc: { attempts: 1 },
        },
        { sort: { availableAt: 1, createdAt: 1 }, new: true },
      );

      if (!doc) break;
      claimed.push(doc);
    }

    return claimed;
  }

  static async heartbeat(id: string): Promise<void> {
    await OutboxEvent.updateOne(
      { _id: id, status: "PROCESSING" },
      { $set: { processingHeartbeatAt: new Date() } },
    );
  }

  static async markProcessed(id: string): Promise<void> {
    await OutboxEvent.updateOne(
      { _id: id },
      {
        $set: {
          status: "PROCESSED",
          processedAt: new Date(),
          deadLetterEligible: false,
          lastError: undefined,
        },
      },
    );
  }

  static async markFailed(id: string, error: unknown): Promise<void> {
    const current = await OutboxEvent.findById(id).select(
      "attempts maxAttempts",
    );
    if (!current) return;

    const attempts = current.attempts ?? 1;
    const maxAttempts = current.maxAttempts ?? 8;
    const isDeadLetter = attempts >= maxAttempts;
    const delay = Math.min(
      BASE_BACKOFF_MS * 2 ** Math.max(attempts - 1, 0),
      MAX_BACKOFF_MS,
    );
    const nextAvailableAt = new Date(Date.now() + delay);
    const lastError = error instanceof Error ? error.message : String(error);

    await OutboxEvent.updateOne(
      { _id: id },
      {
        $set: {
          status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
          deadLetterEligible: isDeadLetter,
          lastError,
          availableAt: nextAvailableAt,
        },
      },
    );
  }

  static async getStats(): Promise<{
    queueDepth: number;
    deadLetterCount: number;
    failedCount: number;
    processingCount: number;
    retryCount: number;
    avgProcessingLatencyMs: number;
  }> {
    const [
      queueDepth,
      deadLetterCount,
      failedCount,
      processingCount,
      retryCount,
      latencyAgg,
    ] = await Promise.all([
      OutboxEvent.countDocuments({ status: { $in: ["PENDING", "FAILED"] } }),
      OutboxEvent.countDocuments({ status: "DEAD_LETTER" }),
      OutboxEvent.countDocuments({ status: "FAILED" }),
      OutboxEvent.countDocuments({ status: "PROCESSING" }),
      OutboxEvent.countDocuments({ attempts: { $gt: 1 } }),
      OutboxEvent.aggregate([
        {
          $match: {
            status: "PROCESSED",
            processingStartedAt: { $exists: true, $ne: null },
            processedAt: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            duration: { $subtract: ["$processedAt", "$processingStartedAt"] },
          },
        },
        {
          $group: { _id: null, avgDuration: { $avg: "$duration" } },
        },
      ]),
    ]);

    return {
      queueDepth,
      deadLetterCount,
      failedCount,
      processingCount,
      retryCount,
      avgProcessingLatencyMs: Number(latencyAgg[0]?.avgDuration ?? 0),
    };
  }
}
