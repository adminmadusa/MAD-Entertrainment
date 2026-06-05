import { Schema, model, Document, Types } from 'mongoose';

export interface IRefund extends Document {
  bookingId: Types.ObjectId;
  paymentId: Types.ObjectId;
  amount: number;
  currency: string;
  reason?: string;
  status: 'requested' | 'processing' | 'completed' | 'failed';
  adminNotes?: string;
  gatewayRefundId?: string;
  idempotencyKey?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    reason: String,
    status: {
      type: String,
      enum: ['requested', 'processing', 'completed', 'failed'],
      default: 'requested',
      index: true,
    },
    adminNotes: String,
    gatewayRefundId: String,
    idempotencyKey: { type: String, index: true },
    processedAt: Date,
  },
  { timestamps: true }
);

refundSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['requested', 'processing', 'completed'] },
      idempotencyKey: { $exists: true }
    },
    name: 'idx_refund_idempotency_key_unique'
  }
);

export const Refund = model<IRefund>('Refund', refundSchema);
