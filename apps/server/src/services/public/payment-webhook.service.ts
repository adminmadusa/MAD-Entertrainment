import { PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { Booking, IBooking } from '../../models/booking.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { PaymentRefundService } from './payment-refund.service';
import { PaymentValidationService } from './payment-validation.service';
import type {
  StripeChargeWebhookPayload,
  StripeRefundWebhookPayload,
  RazorpayRefundWebhookPayload,
} from './payment.types';
import { confirmFromWebhookStripeHelper } from './payment/stripe-webhook-confirmation.helper';

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

export class PaymentWebhookService {
  private static assertProductionPaymentIntegrity(
    identifiers: (string | undefined)[],
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    PaymentValidationService.assertProductionPaymentIntegrity(
      identifiers,
      getEnv(),
      context
    );
  }

  private static assertProductionMockRuntimeBlocked(
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    PaymentValidationService.assertProductionMockRuntimeBlocked(
      getEnv(),
      context
    );
  }

  /**
   * Confirms a payment received via Razorpay webhook.
   */
  static async confirmFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    eventType: string,
    webhookEventId: string,
    persistence?: PaymentWebhookPersistence,
    amount?: number,
    currency?: string
  ): Promise<{ status: 'confirmed' | 'failed' | 'skipped'; bookingId?: string }> {
    const isMock = razorpayPaymentId.startsWith('mock_pay_') || razorpayOrderId.startsWith('mock_order_');

    if (isMock) {
      this.assertProductionMockRuntimeBlocked({
        paymentId: razorpayPaymentId,
        gateway: 'razorpay',
        requestSource: 'webhook',
      });
    } else {
      this.assertProductionPaymentIntegrity(
        [razorpayOrderId, razorpayPaymentId],
        {
          gateway: 'razorpay',
          requestSource: 'webhook',
        }
      );
    }

    const payment = await Payment.findOne({
      gatewayOrderId: razorpayOrderId,
      gateway: 'razorpay',
    });

    if (!payment) {
      logger.warn(
        { razorpayOrderId, razorpayPaymentId, eventType, webhookEventId },
        'Razorpay webhook received for unknown order — skipping'
      );
      return { status: 'skipped' };
    }

    const booking = await Booking.findById(payment.bookingId);
    if (!booking) {
      logger.error(
        { bookingId: payment.bookingId, razorpayOrderId, razorpayPaymentId },
        'Payment record references non-existent booking'
      );
      return { status: 'skipped' };
    }

    if (payment.status === PaymentStatus.PAID) {
      logger.info(
        { paymentId: payment._id, bookingId: booking._id, eventType },
        'Payment already confirmed — webhook is idempotent duplicate'
      );
      return { status: 'skipped', bookingId: booking._id.toString() };
    }

    if (!isMock) {
      const expectedAmountPaise = Math.round(booking.totalAmount * 100);
      if (amount !== undefined && amount !== expectedAmountPaise) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            razorpayOrderId,
            razorpayPaymentId,
            expectedAmountPaise,
            receivedAmountPaise: amount,
          },
          'SECURITY: Razorpay webhook payment amount mismatch — potential tampering attempt'
        );

        if (persistence) {
          await persistence.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Amount mismatch: expected ${expectedAmountPaise} paise, received ${amount} paise`,
            'auto_recovery',
            'AMOUNT_MISMATCH'
          );
        } else {
          await PaymentRefundService.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Amount mismatch: expected ${expectedAmountPaise} paise, received ${amount} paise`,
            'auto_recovery',
            'AMOUNT_MISMATCH'
          );
        }

        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            expectedAmountPaise,
            receivedAmountPaise: amount,
            violationType: 'amount_mismatch',
          },
          description: `SECURITY VIOLATION: Razorpay webhook payment amount mismatch for booking ${booking.bookingId}`,
        });

        return { status: 'skipped', bookingId: booking._id.toString() };
      }

      if (currency !== undefined) {
        const expectedCurrency = (booking.currency || 'INR').toUpperCase();
        const receivedCurrency = currency.toUpperCase();
        if (receivedCurrency !== expectedCurrency) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              razorpayOrderId,
              razorpayPaymentId,
              expectedCurrency,
              receivedCurrency,
            },
            'SECURITY: Razorpay webhook payment currency mismatch'
          );

          if (persistence) {
            await persistence.failPaymentAndReleaseInventory(
              booking,
              payment,
              `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`,
              'auto_recovery',
              'CURRENCY_MISMATCH'
            );
          } else {
            await PaymentRefundService.failPaymentAndReleaseInventory(
              booking,
              payment,
              `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`,
              'auto_recovery',
              'CURRENCY_MISMATCH'
            );
          }

          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedCurrency,
              receivedCurrency,
              violationType: 'currency_mismatch',
            },
            description: `SECURITY VIOLATION: Razorpay webhook payment currency mismatch for booking ${booking.bookingId}`,
          });

          return { status: 'skipped', bookingId: booking._id.toString() };
        }
      }
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      payment.gatewayPaymentId = razorpayPaymentId;
      payment.paidAt = new Date();

      if (persistence) {
        const confirmedBooking = await persistence.confirmBooking(booking, payment);
        if (!confirmedBooking) {
          return { status: 'skipped', bookingId: booking._id.toString() };
        }
      }

      logger.info(
        {
          paymentId: payment._id,
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          eventType,
        },
        'Razorpay webhook payment confirmation complete'
      );

      auditLog({
        action: 'PAYMENT_WEBHOOK_CONFIRMED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          razorpayOrderId,
          razorpayPaymentId,
          eventType,
          webhookEventId,
          isMock,
        },
        description: `Confirmed Razorpay payment ${razorpayPaymentId} via webhook event ${eventType} for booking ${booking.bookingId}`,
      });

      return { status: 'confirmed', bookingId: booking._id.toString() };
    }

    if (eventType === 'payment.failed') {
      if (persistence) {
        await persistence.failPaymentAndReleaseInventory(
          booking,
          payment,
          `Razorpay payment failed (webhook event: ${eventType})`
        );
      } else {
        await PaymentRefundService.failPaymentAndReleaseInventory(
          booking,
          payment,
          `Razorpay payment failed (webhook event: ${eventType})`
        );
      }

      auditLog({
        action: 'PAYMENT_WEBHOOK_FAILED',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          razorpayOrderId,
          razorpayPaymentId,
          eventType,
          webhookEventId,
        },
        description: `Recorded payment failure via webhook event ${eventType} for booking ${booking.bookingId}`,
      });

      return { status: 'failed', bookingId: booking._id.toString() };
    }

    return { status: 'skipped', bookingId: booking._id.toString() };
  }

  /**
   * Confirms a payment received via Stripe webhook.
   */
  static async confirmFromWebhookStripe(
    intent: any,
    webhookEventId: string,
    persistence: PaymentWebhookPersistence
  ): Promise<{ status: 'confirmed' | 'failed' | 'skipped'; bookingId?: string }> {
    return confirmFromWebhookStripeHelper(intent, webhookEventId, persistence);
  }

  /**
   * Reconciles refund events sent by Stripe webhooks.
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
    return PaymentRefundService.reconcileStripeRefundWebhook(
      chargeOrRefund,
      webhookEventId,
      eventType
    );
  }

  /**
   * Reconciles refund events sent by Razorpay webhooks.
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
    return PaymentRefundService.reconcileRazorpayRefundWebhook(
      refundEntity,
      eventType,
      webhookEventId
    );
  }
}
