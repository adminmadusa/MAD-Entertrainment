import { Document, model, Schema } from "mongoose";

export const OUTBOX_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "DEAD_LETTER",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_EVENT_TYPES = [
  "BOOKING_CONFIRMED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "TICKETS_ISSUED",
  "INVENTORY_RELEASED",
  "NOTIFICATION_REQUESTED",
  "EMAIL_REQUESTED",
  "SOCKET_EVENT",
] as const;
export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

export interface IOutboxEvent extends Document {
  aggregateType: string;
  aggregateId: string;
  eventType: OutboxEventType;
  payloadVersion: number;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  processingStartedAt?: Date;
  processingHeartbeatAt?: Date;
  processedAt?: Date;
  lastError?: string;
  deadLetterEligible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const outboxEventSchema = new Schema<IOutboxEvent>(
  {
    aggregateType: { type: String, required: true, index: true },
    aggregateId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: OUTBOX_EVENT_TYPES,
      required: true,
      index: true,
    },
    payloadVersion: { type: Number, required: true, default: 1 },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: OUTBOX_STATUSES,
      required: true,
      default: "PENDING",
      index: true,
    },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 8 },
    availableAt: { type: Date, required: true, default: Date.now, index: true },
    processingStartedAt: Date,
    processingHeartbeatAt: Date,
    processedAt: Date,
    lastError: String,
    deadLetterEligible: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, availableAt: 1 });
outboxEventSchema.index({ eventType: 1, status: 1 });
outboxEventSchema.index({ createdAt: 1 });
outboxEventSchema.index({ deadLetterEligible: 1, status: 1 });
outboxEventSchema.index({
  aggregateType: 1,
  aggregateId: 1,
  eventType: 1,
  payloadVersion: 1,
});

export const OutboxEvent = model<IOutboxEvent>(
  "OutboxEvent",
  outboxEventSchema,
);
