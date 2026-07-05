import { Types } from 'mongoose';
import { PaymentStatus } from '@mad/shared';
import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { PaymentOwnershipContext } from './payment-intent.service';
import { PaymentValidationService } from './payment-validation.service';
import { StripeAdapter } from './stripe.adapter';

export interface PaymentVerifyPersistence {
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

export class PaymentVerifyService {
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
   * BUG-297 — Validates cryptographic gateway proof for an already-PAID payment.
   * Exposes authoritative confirmation of purchase ownership.
   */
  private static async validateGatewayProof(
    booking: IBooking,
    payment: IPayment,
    gatewayPayload: any,
    env: ReturnType<typeof getEnv>
  ): Promise<void> {
    if (payment.gateway === 'razorpay') {
      const { razorpay_payment_id, razorpay_signature } = gatewayPayload || {};
      const isMock =
        env.MOCK_PAYMENTS &&
        razorpay_payment_id?.startsWith('pay_mock_') &&
        razorpay_signature === 'mock_signature';

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: razorpay_payment_id,
          gateway: 'razorpay',
          requestSource: 'frontend_verify',
        });
      }

      // Replay protection DB check
      const duplicateGatewayPayment = await Payment.findOne({
        gateway: 'razorpay',
        gatewayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      });

      PaymentValidationService.validateRazorpayProof({
        booking,
        payment,
        gatewayPayload,
        hasDuplicatePayment: Boolean(duplicateGatewayPayment),
        isMock,
        razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
      });
    } else {
      const { paymentIntentId } = gatewayPayload || {};
      if (!paymentIntentId) {
        throw AppError.badRequest(
          'Missing Stripe paymentIntentId in payment payload'
        );
      }

      const isMock = env.MOCK_PAYMENTS && paymentIntentId.startsWith('pi_mock_');

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: paymentIntentId,
          gateway: 'stripe',
          requestSource: 'frontend_verify',
        });
        return;
      }

      const intent = await StripeAdapter.retrievePaymentIntent(paymentIntentId);

      PaymentValidationService.validateStripeProof({
        booking,
        payment,
        intent,
        isMock,
      });
    }
  }

  /**
   * Verifies payment redirects from Stripe/Razorpay checkouts on the frontend.
   * Delegates persistence modifications to the facade via PaymentVerifyPersistence.
   */
  static async verifyPayment(
    bookingId: string,
    gatewayPayload: any,
    ownershipContext: PaymentOwnershipContext = {},
    persistence: PaymentVerifyPersistence
  ) {
    const query = Types.ObjectId.isValid(bookingId)
      ? { _id: bookingId }
      : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const { paymentIntentId, razorpay_order_id, razorpay_payment_id } =
      gatewayPayload || {};

    this.assertProductionPaymentIntegrity(
      [paymentIntentId, razorpay_order_id, razorpay_payment_id],
      {
        bookingId: booking._id.toString(),
        gateway: paymentIntentId ? 'stripe' : 'razorpay',
        requestSource: 'frontend_verify',
      }
    );

    let payment;
    if (paymentIntentId) {
      payment = await Payment.findOne({
        bookingId: booking._id,
        gatewayOrderId: paymentIntentId,
        gateway: 'stripe',
      }).sort({ createdAt: -1 });
    } else if (razorpay_order_id) {
      payment = await Payment.findOne({
        bookingId: booking._id,
        gatewayOrderId: razorpay_order_id,
        gateway: 'razorpay',
      }).sort({ createdAt: -1 });
    } else if (razorpay_payment_id) {
      payment = await Payment.findOne({
        bookingId: booking._id,
        gatewayPaymentId: razorpay_payment_id,
        gateway: 'razorpay',
      }).sort({ createdAt: -1 });
    } else {
      throw AppError.badRequest(
        'Payment verification requires a payment identifier'
      );
    }

    if (!payment) {
      throw AppError.notFound('Payment record not found for booking');
    }

    const env = getEnv();

    // 1. Validate the cryptographic gateway proof first.
    await this.validateGatewayProof(booking, payment, gatewayPayload, env);

    // 2. Perform Ownership Recovery/Sync:
    let bookingModified = false;

    if (booking.userId) {
      if (ownershipContext.userId) {
        if (booking.userId.toString() !== ownershipContext.userId) {
          logger.warn(
            {
              bookingId: booking._id,
              existingOwner: booking.userId,
              attemptedOwner: ownershipContext.userId,
            },
            'Ownership recovery blocked: cannot overwrite existing authenticated user ownership'
          );
          throw AppError.forbidden('You do not have access to this booking');
        }
      }
    } else {
      if (ownershipContext.userId) {
        logger.info(
          { bookingId: booking._id, newUser: ownershipContext.userId },
          'Ownership recovery: linking booking to authenticated user'
        );
        booking.userId = new Types.ObjectId(ownershipContext.userId);
        bookingModified = true;
      }

      if (
        ownershipContext.sessionId &&
        booking.sessionId !== ownershipContext.sessionId
      ) {
        logger.info(
          {
            bookingId: booking._id,
            oldSession: booking.sessionId,
            newSession: ownershipContext.sessionId,
          },
          'Ownership recovery: updating booking sessionId to client session'
        );
        booking.sessionId = ownershipContext.sessionId;
        bookingModified = true;
      }
    }

    if (bookingModified) {
      booking.bookingVersion += 1;
      await booking.save();
    }

    // 3. If the webhook already confirmed the payment, return the recovered booking immediately.
    if (payment.status === PaymentStatus.PAID) {
      return booking;
    }

    // 4. If the payment is still PENDING, validate event constraints and confirm booking.
    const event = await Event.findById(booking.eventId);
    if (!event || event.status !== 'published' || event.isDeleted === true) {
      throw AppError.notFound('Event not found or not published');
    }

    const now = new Date();
    if (
      now >= new Date(event.startDate) ||
      (event.endDate && now > new Date(event.endDate))
    ) {
      await persistence.failPaymentAndReleaseInventory(
        booking,
        payment,
        'Event has already started or ended.',
        'auto_recovery',
        'PAYMENT_VALIDATION_FAILURE'
      );
      throw AppError.badRequest('This event is no longer available for booking.');
    }

    let confirmedBooking: IBooking | null = null;

    if (payment.gateway === 'razorpay') {
      const { razorpay_payment_id, razorpay_signature } = gatewayPayload;
      const isMock =
        env.MOCK_PAYMENTS &&
        razorpay_payment_id.startsWith('pay_mock_') &&
        razorpay_signature === 'mock_signature';

      payment.gatewayPaymentId = razorpay_payment_id;
      payment.gatewaySignature = razorpay_signature;
      payment.paidAt = new Date();

      auditLog({
        action: 'PAYMENT_VERIFIED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          razorpayPaymentId: razorpay_payment_id,
          isMock,
        },
        description: isMock
          ? `Verified mock Razorpay payment ${razorpay_payment_id} for booking ${booking.bookingId}`
          : `Verified Razorpay payment ${razorpay_payment_id} for booking ${booking.bookingId}`,
      });

      confirmedBooking = await persistence.confirmBooking(booking, payment);
    } else {
      // Stripe
      const isMock = env.MOCK_PAYMENTS && paymentIntentId.startsWith('pi_mock_');

      payment.gatewayPaymentId = paymentIntentId;
      payment.paidAt = new Date();

      auditLog({
        action: 'PAYMENT_VERIFIED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          paymentIntentId,
          isMock,
        },
        description: isMock
          ? `Verified mock Stripe payment intent ${paymentIntentId} for booking ${booking.bookingId}`
          : `Verified Stripe payment intent ${paymentIntentId} for booking ${booking.bookingId}`,
      });

      confirmedBooking = await persistence.confirmBooking(booking, payment);
    }

    if (confirmedBooking) {
      return confirmedBooking;
    }

    const latestBooking = await Booking.findById(booking._id);
    return latestBooking || booking;
  }
}
