import { getEnv } from '../../../config/env';
import { Booking } from '../../../models/booking.schema';
import { Payment, IPayment } from '../../../models/payment.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { PaymentValidationService } from '../payment-validation.service';
import type { PaymentWebhookPersistence } from '../payment-webhook.service';

export async function confirmFromWebhookStripeHelper(
  intent: any,
  webhookEventId: string,
  persistence: PaymentWebhookPersistence
): Promise<{ status: 'confirmed' | 'failed' | 'skipped'; bookingId?: string }> {
  try {
    const isMock = intent.id?.startsWith('mock_pi_');

    if (isMock) {
      PaymentValidationService.assertProductionMockRuntimeBlocked(getEnv(), {
        bookingId: intent.metadata?.bookingId,
        paymentId: intent.id,
        gateway: 'stripe',
        requestSource: 'webhook',
      });
    } else {
      PaymentValidationService.assertProductionPaymentIntegrity(
        [intent.id, intent.client_secret],
        getEnv(),
        {
          gateway: 'stripe',
          requestSource: 'webhook',
        }
      );
    }

    const intentBookingId = intent.metadata?.bookingId;
    let payment: IPayment | null = null;
    let booking: any = null;

    if (intentBookingId) {
      booking = await Booking.findById(intentBookingId);
      if (booking && booking.paymentId) {
        payment = await Payment.findById(booking.paymentId);
      }
    }

    if (!payment) {
      payment = await Payment.findOne({
        $or: [{ gatewayPaymentId: intent.id }, { clientSecret: intent.client_secret }],
        gateway: 'stripe',
      });
      if (payment) {
        booking = await Booking.findById(payment.bookingId);
      }
    }

    if (!payment || !booking) {
      logger.warn(
        {
          paymentIntentId: intent.id,
          webhookEventId,
          intentBookingId,
          hasPayment: !!payment,
          hasBooking: !!booking,
        },
        'Stripe webhook received but no matching Payment or Booking record found'
      );
      return { status: 'skipped' };
    }

    if (payment.status === 'paid') {
      logger.info(
        { paymentId: payment._id, bookingId: booking._id },
        'Payment already confirmed — Stripe webhook is idempotent duplicate'
      );
      return { status: 'skipped', bookingId: booking._id.toString() };
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
      if (intentBookingReference && intentBookingReference !== booking.bookingId) {
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
      if (receivedAmountPaise !== undefined && receivedAmountPaise !== expectedAmountPaise) {
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
