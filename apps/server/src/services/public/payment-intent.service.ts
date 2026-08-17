import crypto from 'crypto';

import { Types } from 'mongoose';

import { BookingStatus, PaymentStatus, ReservationStatus, deriveBookingEligibility } from '@mad/shared';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { ReservationService } from '../reservation.service';
import { PublicBookingService } from './booking.service';
import { PaymentValidationService } from './payment-validation.service';
import { RazorpayAdapter } from './razorpay.adapter';
import { StripeAdapter } from './stripe.adapter';


export type PaymentOwnershipContext = {
  userId?: string;
  sessionId?: string;
  trustedInternal?: boolean;
};

export class PaymentIntentService {
  private static assertBookingOwnership(
    booking: IBooking,
    ownershipContext: PaymentOwnershipContext
  ): void {
    if (ownershipContext.trustedInternal) {
      return;
    }

    PublicBookingService.assertBookingAccess(
      booking,
      { userId: ownershipContext.userId, sessionId: ownershipContext.sessionId },
      'ActiveCheckout'
    );
  }

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
   * Helper to create a new pending payment record directly.
   * Extracted from PaymentService to avoid circular dependency.
   */
  private static async createPendingPayment(
    bookingId: Types.ObjectId,
    gateway: string,
    amount: number,
    currency: string,
    couponId?: Types.ObjectId,
    gatewayOrderId?: string
  ): Promise<IPayment> {
    return Payment.create({
      bookingId,
      gateway,
      status: PaymentStatus.PENDING,
      amount,
      currency,
      couponId,
      gatewayOrderId,
    });
  }

  /**
   * Extracted from PaymentService to coordinate payment intent creation.
   * Delegates back to local handlers handleRazorpayIntent and handleStripeIntent.
   */
  static async createPaymentIntent(
    bookingId: string,
    gateway: 'stripe' | 'razorpay',
    ownershipContext: PaymentOwnershipContext = {},
    confirmBookingFacade: (booking: IBooking, payment: IPayment) => Promise<IBooking | null>
  ) {
    this.assertProductionPaymentIntegrity([bookingId], { bookingId, gateway });

    const query = Types.ObjectId.isValid(bookingId)
      ? { _id: bookingId }
      : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    this.assertBookingOwnership(booking, ownershipContext);

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest(
        `Booking is in state "${booking.status}" and cannot accept payment`
      );
    }

    const event = await Event.findById(booking.eventId);
    if (!event || event.status !== 'published' || event.isDeleted === true) {
      throw AppError.notFound('Event not found or not published');
    }

    const eligibility = deriveBookingEligibility(event as any);
    if (!eligibility.bookingAllowed) {
      throw AppError.badRequest(`This event is no longer available for booking. Reason: ${eligibility.bookingReason}`);
    }

    if (booking.totalAmount === 0) {
      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'free',
        status: PaymentStatus.PAID,
        amount: 0,
        currency: booking.currency || 'USD',
        gatewayOrderId: `free_${crypto.randomBytes(8).toString('hex')}`,
      });
      const confirmedBooking = await confirmBookingFacade(booking, payment);
      if (!confirmedBooking) {
        throw new AppError('Failed to confirm free booking', 500);
      }
      return {
        isFree: true,
        gateway: 'free',
        bookingId: confirmedBooking._id,
      };
    }

    const env = getEnv();

    // ─── Payment Intent Reuse / Fingerprint check ───────────────────
    const existingPayment = await Payment.findOne({
      bookingId: booking._id,
      gateway,
      status: PaymentStatus.PENDING,
    });

    if (existingPayment) {
      const matchesFingerprint =
        existingPayment.amount === booking.totalAmount &&
        existingPayment.currency === (booking.currency || 'USD') &&
        existingPayment.couponId?.toString() === booking.couponId?.toString();

      const ageMs = Date.now() - existingPayment.createdAt.getTime();
      const isExpired = ageMs > 24 * 60 * 60 * 1000;

      if (matchesFingerprint && !isExpired) {
        logger.info(
          { bookingId: booking._id, gateway, paymentId: existingPayment._id },
          'Reusing active matching pending payment intent.'
        );

        if (gateway === 'razorpay') {
          return {
            gateway: 'razorpay',
            keyId: env.RAZORPAY_KEY_ID || 'mock_key_id',
            orderId: existingPayment.gatewayOrderId,
            amount: Math.round(existingPayment.amount * 100),
            currency: existingPayment.currency,
            bookingId: booking._id,
            ...(env.MOCK_PAYMENTS ? { isMock: true } : {}),
          };
        } else {
          let clientSecret = '';
          if (env.MOCK_PAYMENTS) {
            clientSecret = existingPayment.gatewayOrderId + '_secret_mock';
          } else {
            const intent = await StripeAdapter.retrievePaymentIntent(
              existingPayment.gatewayOrderId!
            );
            clientSecret = intent.client_secret!;
          }

          return {
            gateway: 'stripe',
            publishableKey: env.STRIPE_PUBLISHABLE_KEY,
            clientSecret,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            bookingId: booking._id,
            ...(env.MOCK_PAYMENTS ? { isMock: true } : {}),
          };
        }
      } else {
        existingPayment.status = PaymentStatus.FAILED;
        existingPayment.failedAt = new Date();
        existingPayment.failureReason = isExpired
          ? 'PENDING_INTENT_EXPIRED'
          : 'PENDING_INTENT_SUPERSEDED';
        await existingPayment.save();
        logger.info(
          {
            bookingId: booking._id,
            paymentId: existingPayment._id,
            reason: existingPayment.failureReason,
          },
          'Stale or mismatched pending payment expired/superseded.'
        );
      }
    }

    if (gateway === 'razorpay') {
      return this.handleRazorpayIntent(booking, env);
    }

    return this.handleStripeIntent(booking, env);
  }

  private static async handleRazorpayIntent(
    booking: IBooking,
    env: ReturnType<typeof getEnv>
  ) {
    if (env.MOCK_PAYMENTS) {
      this.assertProductionMockRuntimeBlocked({
        bookingId: booking._id.toString(),
        gateway: 'razorpay',
      });
      const mockOrderId = 'order_mock_' + crypto.randomBytes(4).toString('hex');
      const payment = await this.createPendingPayment(
        booking._id,
        'razorpay',
        booking.totalAmount,
        'INR',
        booking.couponId,
        mockOrderId
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.PENDING_PAYMENT,
        {
          paymentReference: mockOrderId,
          paymentId: payment._id as any,
          reason: 'mock-razorpay-intent-created',
          correlationId: booking.bookingId,
        }
      );

      auditLog({
        action: 'PAYMENT_INTENT_CREATED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          orderId: mockOrderId,
          amount: booking.totalAmount,
          isMock: true,
        },
        description: `Created mock Razorpay payment order ${mockOrderId} for booking ${booking.bookingId}`,
      });

      return {
        gateway: 'razorpay',
        keyId: 'mock_key_id',
        orderId: mockOrderId,
        amount: Math.round(booking.totalAmount * 100),
        currency: 'INR',
        bookingId: booking._id,
        isMock: true,
      };
    }

    if (!RazorpayAdapter.isEnabled()) {
      throw AppError.badRequest('Razorpay is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (amountPaise < 100) {
      throw AppError.badRequest(
        'Amount must be at least 1 INR (100 paise) for Razorpay transactions'
      );
    }

    try {
      const order = await RazorpayAdapter.createOrder({
        amountPaise,
        currency: 'INR',
        receipt: booking.bookingId,
      });

      const payment = await this.createPendingPayment(
        booking._id,
        'razorpay',
        booking.totalAmount,
        'INR',
        booking.couponId,
        order.id
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.PENDING_PAYMENT,
        {
          paymentReference: order.id,
          paymentId: payment._id as any,
          reason: 'razorpay-intent-created',
          correlationId: booking.bookingId,
        }
      );

      auditLog({
        action: 'PAYMENT_INTENT_CREATED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'razorpay',
          orderId: order.id,
          amount: booking.totalAmount,
        },
        description: `Created Razorpay payment order ${order.id} for booking ${booking.bookingId}`,
      });

      return {
        gateway: 'razorpay',
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: booking._id,
      };
    } catch (err: any) {
      logger.error({ err }, 'Razorpay API call failed');
      const statusCode = err.statusCode || 400;
      const description =
        err.error?.description || err.message || 'Razorpay order creation failed';
      throw new AppError(
        `Razorpay payment intent failed: ${description}`,
        statusCode
      );
    }
  }

  private static async handleStripeIntent(
    booking: IBooking,
    env: ReturnType<typeof getEnv>
  ) {
    if (env.MOCK_PAYMENTS) {
      this.assertProductionMockRuntimeBlocked({
        bookingId: booking._id.toString(),
        gateway: 'stripe',
      });
      const mockIntentId = 'pi_mock_' + crypto.randomBytes(4).toString('hex');
      const payment = await this.createPendingPayment(
        booking._id,
        'stripe',
        booking.totalAmount,
        booking.currency || 'USD',
        booking.couponId,
        mockIntentId
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.PENDING_PAYMENT,
        {
          paymentReference: mockIntentId,
          paymentId: payment._id as any,
          reason: 'mock-stripe-intent-created',
          correlationId: booking.bookingId,
        }
      );

      auditLog({
        action: 'PAYMENT_INTENT_CREATED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          paymentIntentId: mockIntentId,
          amount: booking.totalAmount,
          isMock: true,
        },
        description: `Created mock Stripe payment intent ${mockIntentId} for booking ${booking.bookingId}`,
      });

      return {
        gateway: 'stripe',
        publishableKey: env.STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy',
        clientSecret:
          mockIntentId + '_secret_' + crypto.randomBytes(4).toString('hex'),
        amount: booking.totalAmount,
        currency: booking.currency || 'USD',
        bookingId: booking._id,
        isMock: true,
      };
    }

    if (!StripeAdapter.isEnabled()) {
      throw AppError.badRequest('Stripe is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    try {
      const paymentIntent = await StripeAdapter.createPaymentIntent({
        amountPaise,
        currency: booking.currency || 'USD',
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingId,
      });

      const payment = await this.createPendingPayment(
        booking._id,
        'stripe',
        booking.totalAmount,
        booking.currency || 'USD',
        booking.couponId,
        paymentIntent.id
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(
        booking._id,
        ReservationStatus.PENDING_PAYMENT,
        {
          paymentReference: paymentIntent.id,
          paymentId: payment._id as any,
          reason: 'stripe-intent-created',
          correlationId: booking.bookingId,
        }
      );

      auditLog({
        action: 'PAYMENT_INTENT_CREATED',
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          gateway: 'stripe',
          paymentIntentId: paymentIntent.id,
          amount: booking.totalAmount,
        },
        description: `Created Stripe payment intent ${paymentIntent.id} for booking ${booking.bookingId}`,
      });

      return {
        gateway: 'stripe',
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        clientSecret: paymentIntent.client_secret,
        amount: booking.totalAmount,
        currency: booking.currency,
        bookingId: booking._id,
      };
    } catch (err: any) {
      logger.error({ err }, 'Stripe API call failed');
      const statusCode = err.statusCode || 400;
      const description = err.message || 'Stripe payment intent creation failed';
      throw new AppError(
        `Stripe payment intent failed: ${description}`,
        statusCode
      );
    }
  }
}
