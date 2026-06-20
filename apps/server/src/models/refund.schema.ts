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
  origin: 'manual' | 'auto_recovery';
  recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE';
  cancelTickets: boolean;
  processedAt?: Date;
  gatewayRefundStatus?: string;
  reconciledAt?: Date;
  webhookEventId?: string;
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
    gatewayRefundStatus: String,
    reconciledAt: Date,
    webhookEventId: String,
    idempotencyKey: { type: String, index: true },
    processedAt: Date,
    origin: {
      type: String,
      enum: ['manual', 'auto_recovery'],
      default: 'manual',
      required: true,
    },
    recoveryReason: {
      type: String,
      enum: [
        'AMOUNT_MISMATCH',
        'BOOKING_REFERENCE_MISMATCH',
        'BOOKING_ID_MISMATCH',
        'CURRENCY_MISMATCH',
        'PAYMENT_VALIDATION_FAILURE',
        'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE',
      ],
    },
    cancelTickets: {
      type: Boolean,
      default: false,
    },
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

refundSchema.index(
  { gatewayRefundId: 1 },
  { sparse: true, name: 'idx_refund_gateway_refund_id' }
);

export const Refund = model<IRefund>('Refund', refundSchema);
