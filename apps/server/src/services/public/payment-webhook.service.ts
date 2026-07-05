import { Types } from 'mongoose';
import { PaymentStatus } from '@mad/shared';
import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { PaymentValidationService } from './payment-validation.service';
import { PaymentRefundService } from './payment-refund.service';
import type {
  StripeChargeWebhookPayload,
  StripeRefundWebhookPayload,
  RazorpayRefundWebhookPayload,
} from './payment.types';

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
    code?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
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
   * PR-03 — Razorpay Webhook Confirmation Path
   * Coordinates confirmation for captured or failed Razorpay checkout orders.
   */
  static async confirmFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    eventType: string,
    webhookEventId: string,
    persistence: PaymentWebhookPersistence,
    amountPaise?: number,
    currency?: string
  ): Promise<{ status: 'confirmed' | 'failed' | 'skipped'; bookingId?: string }> {
    this.assertProductionPaymentIntegrity([razorpayOrderId, razorpayPaymentId], {
      paymentId: razorpayPaymentId,
      gateway: 'razorpay',
      requestSource: 'webhook',
    });

    const payment = await Payment.findOne({
      gatewayOrderId: razorpayOrderId,
      gateway: 'razorpay',
    });

    if (!payment) {
      logger.warn(
        { razorpayOrderId, razorpayPaymentId, webhookEventId, eventType },
        'PR-03: Razorpay webhook received but no matching Payment record found for orderId'
      );
      return { status: 'skipped' };
    }

    const booking = await Booking.findById(payment.bookingId);

    if (!booking) {
      logger.error(
        {
          razorpayOrderId,
          razorpayPaymentId,
          paymentId: payment._id,
          webhookEventId,
        },
        'PR-03: Payment record exists but associated Booking is missing — data integrity issue'
      );
      return { status: 'skipped' };
    }

    logger.info(
      {
        razorpayOrderId,
        razorpayPaymentId,
        webhookEventId,
        eventType,
        bookingId: booking._id,
        bookingReference: booking.bookingId,
        paymentId: payment._id,
        bookingStatus: booking.status,
        paymentStatus: payment.status,
      },
      'PR-03: Razorpay webhook processing payment confirmation'
    );

    if (payment.status === PaymentStatus.PAID) {
      logger.info(
        {
          razorpayOrderId,
          razorpayPaymentId,
          bookingId: booking._id,
          webhookEventId,
        },
        'PR-03: Payment already confirmed — webhook idempotency skip'
      );
      return { status: 'skipped', bookingId: booking._id.toString() };
    }

    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      payment.gatewayPaymentId = razorpayPaymentId;
      payment.paidAt = new Date();

      const confirmedBooking = await persistence.confirmBooking(booking, payment);

      if (!confirmedBooking) {
        return { status: 'skipped', bookingId: booking._id.toString() };
      }

      logger.info(
        {
          razorpayOrderId,
          razorpayPaymentId,
          webhookEventId,
          bookingId: booking._id,
          bookingReference: booking.bookingId,
        },
        'PR-03: Razorpay webhook payment confirmation complete'
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
          webhookEventId,
          eventType,
        },
        description: `Confirmed Razorpay payment ${razorpayPaymentId} via webhook event ${eventType} for booking ${booking.bookingId}`,
      });

      return { status: 'confirmed', bookingId: booking._id.toString() };
    }

    if (eventType === 'payment.failed') {
      await persistence.failPaymentAndReleaseInventory(
        booking,
        payment,
        `Razorpay webhook: ${eventType}`
      );

      logger.warn(
        {
          razorpayOrderId,
          razorpayPaymentId,
          webhookEventId,
          bookingId: booking._id,
          bookingReference: booking.bookingId,
        },
        'PR-03: Razorpay webhook payment failure — inventory released'
      );

      auditLog({
        action: 'PAYMENT_WEBHOOK_FAILED',
        status: 'failure',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          razorpayOrderId,
          razorpayPaymentId,
          webhookEventId,
          eventType,
        },
        description: `Failed Razorpay payment ${razorpayPaymentId} via webhook event ${eventType} for booking ${booking.bookingId} - inventory released`,
      });

      return { status: 'failed', bookingId: booking._id.toString() };
    }

    logger.debug(
      { razorpayOrderId, razorpayPaymentId, webhookEventId, eventType },
      'PR-03: Razorpay webhook event type not actionable — acknowledging without processing'
    );
    return { status: 'skipped' };
  }

  /**
   * Stripe Webhook Confirmation Path
   * Coordinates confirmation for completed Stripe checkout intents.
   */
  static async confirmFromWebhookStripe(
    intent: {
      id: string;
      metadata?: { bookingId?: string; bookingReference?: string };
      amount?: number;
      amount_received?: number;
      currency?: string;
    },
    webhookEventId: string,
    persistence: PaymentWebhookPersistence
  ): Promise<{ status: 'confirmed' | 'skipped' | 'failed'; bookingId?: string }> {
    this.assertProductionPaymentIntegrity([intent.id], {
      bookingId: intent.metadata?.bookingId,
      paymentId: intent.id,
      gateway: 'stripe',
      requestSource: 'webhook',
    });

    try {
      const intentBookingId = intent.metadata?.bookingId;
      if (!intentBookingId) {
        logger.warn(
          { paymentIntentId: intent.id, webhookEventId },
          'Stripe webhook received but missing bookingId metadata'
        );
        return { status: 'skipped' };
      }

      const payment = await Payment.findOne({
        gatewayOrderId: intent.id,
        gateway: 'stripe',
      });
      if (!payment) {
        logger.warn(
          { paymentIntentId: intent.id, webhookEventId },
          'Stripe webhook received but no matching Payment record found'
        );
        return { status: 'skipped' };
      }

      const booking = await Booking.findById(payment.bookingId);
      if (!booking) {
        logger.error(
          { paymentIntentId: intent.id, paymentId: payment._id, webhookEventId },
          'Payment record exists but associated Booking is missing'
        );
        return { status: 'skipped' };
      }

      logger.info(
        {
          paymentIntentId: intent.id,
          webhookEventId,
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          paymentId: payment._id,
          bookingStatus: booking.status,
          paymentStatus: payment.status,
        },
        'Stripe webhook processing payment confirmation'
      );

      if (payment.status === PaymentStatus.PAID) {
        logger.info(
          { paymentIntentId: intent.id, bookingId: booking._id, webhookEventId },
          'Payment already confirmed — webhook idempotency skip'
        );
        return { status: 'skipped', bookingId: booking._id.toString() };
      }

      const env = getEnv();
      const isMock = env.MOCK_PAYMENTS && intent.id.startsWith('pi_mock_');

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: intent.id,
          gateway: 'stripe',
          requestSource: 'webhook',
        });
      }

      if (!isMock) {
        if (intentBookingId !== booking._id.toString()) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId: intent.id,
              intentBookingId,
            },
            'SECURITY: Stripe webhook bookingId metadata mismatch — possible replay attack'
          );
          await persistence.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Stripe webhook metadata mismatch: bookingId`,
            'auto_recovery',
            'BOOKING_ID_MISMATCH'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'stripe',
              intentBookingId,
              violationType: 'booking_id_mismatch',
            },
            description: `SECURITY VIOLATION: Stripe webhook bookingId mismatch for booking ${booking.bookingId}`,
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        const intentBookingReference = intent.metadata?.bookingReference;
        if (
          intentBookingReference &&
          intentBookingReference !== booking.bookingId
        ) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId: intent.id,
              intentBookingReference,
            },
            'SECURITY: Stripe webhook bookingReference metadata mismatch'
          );
          await persistence.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Stripe webhook metadata mismatch: bookingReference`,
            'auto_recovery',
            'BOOKING_REFERENCE_MISMATCH'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'stripe',
              intentBookingReference,
              violationType: 'booking_reference_mismatch',
            },
            description: `SECURITY VIOLATION: Stripe webhook bookingReference mismatch for booking ${booking.bookingId}`,
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        const expectedAmountPaise = Math.round(booking.totalAmount * 100);
        const receivedAmountPaise = intent.amount_received ?? intent.amount;
        if (
          receivedAmountPaise !== undefined &&
          receivedAmountPaise !== expectedAmountPaise
        ) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId: intent.id,
              expectedAmountPaise,
              receivedAmountPaise,
            },
            'SECURITY: Stripe webhook payment amount mismatch'
          );
          await persistence.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Amount mismatch: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise}`,
            'auto_recovery',
            'AMOUNT_MISMATCH'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'stripe',
              expectedAmountPaise,
              receivedAmountPaise,
              violationType: 'amount_mismatch',
            },
            description: `SECURITY VIOLATION: Stripe webhook payment amount mismatch for booking ${booking.bookingId}`,
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        if (intent.currency !== undefined) {
          const expectedCurrency = (booking.currency || 'USD').toLowerCase();
          const receivedCurrency = intent.currency.toLowerCase();
          if (receivedCurrency !== expectedCurrency) {
            logger.error(
              {
                bookingId: booking._id,
                bookingReference: booking.bookingId,
                paymentIntentId: intent.id,
                expectedCurrency,
                receivedCurrency,
              },
              'SECURITY: Stripe webhook payment currency mismatch'
            );
            await persistence.failPaymentAndReleaseInventory(
              booking,
              payment,
              `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`,
              'auto_recovery',
              'CURRENCY_MISMATCH'
            );
            auditLog({
              action: 'PAYMENT_SECURITY_VIOLATION',
              status: 'failure',
              metadata: {
                bookingId: booking._id.toString(),
                bookingReference: booking.bookingId,
                gateway: 'stripe',
                expectedCurrency,
                receivedCurrency,
                violationType: 'currency_mismatch',
              },
              description: `SECURITY VIOLATION: Stripe webhook payment currency mismatch for booking ${booking.bookingId}`,
            });
            return { status: 'skipped', bookingId: booking._id.toString() };
          }
        }
      }

      payment.gatewayPaymentId = intent.id;
      payment.paidAt = new Date();

      const confirmedBooking = await persistence.confirmBooking(booking, payment);
      if (!confirmedBooking) {
        return { status: 'skipped', bookingId: booking._id.toString() };
      }

      logger.info(
        {
          paymentIntentId: intent.id,
          webhookEventId,
          bookingId: booking._id,
          bookingReference: booking.bookingId,
        },
        'Stripe webhook payment confirmation complete'
      );

      auditLog({
        action: 'PAYMENT_WEBHOOK_CONFIRMED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          paymentIntentId: intent.id,
          webhookEventId,
          isMock,
        },
        description: `Confirmed Stripe payment ${intent.id} via webhook for booking ${booking.bookingId}`,
      });

      return { status: 'confirmed', bookingId: booking._id.toString() };
    } catch (err: any) {
      logger.error(
        { err, paymentIntentId: intent.id, webhookEventId },
        'Unexpected error in Stripe webhook confirmation'
      );
      throw err;
    }
  }

  /**
   * Reconciles refund events sent by Stripe webhooks.
   */
  static async reconcileStripeRefundWebhook(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
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
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    return PaymentRefundService.reconcileRazorpayRefundWebhook(
      refundEntity,
      eventType,
      webhookEventId
    );
  }
}
