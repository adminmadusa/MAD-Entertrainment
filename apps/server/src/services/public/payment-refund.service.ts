import { ClientSession } from 'mongoose';
import { IBooking } from '../../models/booking.schema';
import { IPayment } from '../../models/payment.schema';
import type {
  StripeChargeWebhookPayload,
  StripeRefundWebhookPayload,
  RazorpayRefundWebhookPayload,
} from './payment.types';
import { RazorpayRefundService } from './payment/razorpay-refund.service';
import { StripeRefundService } from './payment/stripe-refund.service';
import { PaymentFailureService } from './payment/payment-failure.service';
import { PaymentRefundReconciliationService } from './payment/payment-refund-reconciliation.service';

export class PaymentRefundService {
  /**
   * Creates an automatic Refund record in `requested` status.
   */
  static async triggerRefundRequest(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    session?: ClientSession,
    origin: 'manual' | 'auto_recovery' = 'manual',
    recoveryReason?:
      | 'AMOUNT_MISMATCH'
      | 'BOOKING_REFERENCE_MISMATCH'
      | 'BOOKING_ID_MISMATCH'
      | 'CURRENCY_MISMATCH'
      | 'PAYMENT_VALIDATION_FAILURE'
      | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ): Promise<void> {
    return PaymentFailureService.triggerRefundRequest(
      booking,
      payment,
      reason,
      session,
      origin,
      recoveryReason
    );
  }

  /**
   * Marks the payment as FAILED, persists the failure reason, and releases
   * all inventory held by the booking (reservations, seat locks).
   */
  static async failPaymentAndReleaseInventory(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    origin?: 'manual' | 'auto_recovery',
    recoveryReason?:
      | 'AMOUNT_MISMATCH'
      | 'BOOKING_REFERENCE_MISMATCH'
      | 'BOOKING_ID_MISMATCH'
      | 'CURRENCY_MISMATCH'
      | 'PAYMENT_VALIDATION_FAILURE'
      | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ) {
    return PaymentFailureService.failPaymentAndReleaseInventory(
      booking,
      payment,
      reason,
      origin,
      recoveryReason
    );
  }

  /**
   * Handles `charge.refunded` and `refund.updated` / `refund.failed` Stripe events.
   */
  static async reconcileStripeRefundWebhook(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): Promise<{
    status: 'completed' | 'failed' | 'anomaly' | 'skipped';
    refundId?: string;
    paymentId?: string;
  }> {
    const parseResult = StripeRefundService.parseStripeRefund(
      chargeOrRefund,
      webhookEventId,
      eventType
    );
    if (parseResult.status === 'skipped') {
      return { status: 'skipped' };
    }
    return PaymentRefundReconciliationService.reconcileRefundWebhook(parseResult.data);
  }

  /**
   * Handles `refund.processed` and `refund.failed` Razorpay events.
   */
  static async reconcileRazorpayRefundWebhook(
    refundEntity: RazorpayRefundWebhookPayload,
    eventType: string,
    webhookEventId: string
  ): Promise<{
    status: 'completed' | 'failed' | 'anomaly' | 'skipped';
    refundId?: string;
    paymentId?: string;
  }> {
    const parseResult = RazorpayRefundService.parseRazorpayRefund(
      refundEntity,
      eventType,
      webhookEventId
    );
    if (parseResult.status === 'skipped') {
      return { status: 'skipped' };
    }
    return PaymentRefundReconciliationService.reconcileRefundWebhook(parseResult.data);
  }
}
