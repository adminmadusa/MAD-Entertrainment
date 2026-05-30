import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  provider: 'stripe' | 'razorpay';
  eventType?: string;
  status: 'received' | 'processing' | 'success' | 'failed' | 'ignored';
  errorMessage?: string;
  receivedAt: Date;
  processedAt?: Date;
  providerEventTimestamp?: Date;
  bookingId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  payloadSize?: number;
  rawPayload?: Record<string, any>;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
    eventType: { type: String },
    status: {
      type: String,
      enum: ['received', 'processing', 'success', 'failed', 'ignored'],
      default: 'received'
    },
    errorMessage: { type: String },
    receivedAt: { type: Date, default: Date.now, index: { expires: '30d' } },
    processedAt: { type: Date },
    providerEventTimestamp: { type: Date },
    // Populated when the webhook triggered a booking confirmation.
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    payloadSize: { type: Number },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

webhookEventSchema.index({ status: 1, receivedAt: -1 });
webhookEventSchema.index({ provider: 1, receivedAt: -1 });

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
