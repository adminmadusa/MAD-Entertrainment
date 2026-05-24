import { Schema, model, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  provider: 'stripe' | 'razorpay';
  processedAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
    processedAt: { type: Date, default: Date.now, index: { expires: '30d' } },
  },
  { timestamps: false }
);

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
