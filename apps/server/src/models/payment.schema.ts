import { PaymentStatus } from '@mad/shared';
import { Document, model, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  bookingId: Types.ObjectId;
  gateway: 'stripe' | 'razorpay';
  status: PaymentStatus;
  amount: number;
  currency: string;
  couponId?: Types.ObjectId;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    gateway: { type: String, enum: ['stripe', 'razorpay'], required: true },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: String,
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1, createdAt: -1 });
paymentSchema.index({ gatewayOrderId: 1, gateway: 1 });
paymentSchema.index(
  { bookingId: 1, gateway: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'idx_booking_gateway_pending_unique'
  }
);

export const Payment = model<IPayment>('Payment', paymentSchema);
