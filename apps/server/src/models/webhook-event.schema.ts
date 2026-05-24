import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  provider: 'stripe' | 'razorpay';
  processedAt: Date;
  bookingId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ['stripe', 'razorpay'], required: true },
    processedAt: { type: Date, default: Date.now, index: { expires: '30d' } },
    // Populated when the webhook triggered a booking confirmation.
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
  },
  { timestamps: false }
);

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
