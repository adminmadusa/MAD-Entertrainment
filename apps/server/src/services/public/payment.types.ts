import type { IBooking } from '../../models/booking.schema';
import type { IPayment } from '../../models/payment.schema';

/**
 * Shared payment webhook payload types.
 *
 * Extracted from payment.service.ts to break the circular dependency between
 * services/public/payment.service.ts and services/public/payment-refund.service.ts.
 *
 * All consumers (controllers, payment-refund.service) import from here.
 * payment.service.ts re-exports these for backward compatibility.
 */

export interface PaymentWebhookPersistence {
  confirmBooking(
    booking: IBooking,
    payment: IPayment
  ): Promise<IBooking | null>;
  failPaymentAndReleaseInventory(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    source?: 'manual' | 'auto_recovery',
    code?:
      | 'AMOUNT_MISMATCH'
      | 'BOOKING_REFERENCE_MISMATCH'
      | 'BOOKING_ID_MISMATCH'
      | 'CURRENCY_MISMATCH'
      | 'PAYMENT_VALIDATION_FAILURE'
      | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ): Promise<void>;
}

export interface StripeChargeWebhookPayload {
  id: string;
  refunds?: {
    data?: Array<{
      id: string;
      amount: number;
    }>;
  };
}

export interface StripeRefundWebhookPayload {
  id: string;
  charge: string;
  status: string;
  amount: number;
}

export interface RazorpayRefundWebhookPayload {
  id: string;
  payment_id: string;
  amount: number;
}

export interface NormalizedRefundData {
  gateway: 'stripe' | 'razorpay';
  gatewayPaymentId: string;
  gatewayRefundId: string;
  amountMajorUnits: number;
  gatewayStatus: string;
  webhookEventId: string;
}

export type NormalizedRefundPayload =
  | { status: 'skipped' }
  | { status: 'process'; data: NormalizedRefundData };
