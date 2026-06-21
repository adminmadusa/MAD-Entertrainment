import crypto from 'crypto';
import { Types, ClientSession } from 'mongoose';
import * as Sentry from '@sentry/node';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType, RefundStatus } from '@mad/shared';

import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { getRazorpay, isRazorpayEnabled } from '../../config/razorpay';
import { getStripe, isStripeEnabled } from '../../config/stripe';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { UserModel } from '../../models/user.schema';
import { logger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { sendEmail } from '../../utils/email';
import { generateTicketPDF } from '../../utils/pdf';
import { paymentFailureHtml, fullRefundHtml, partialRefundHtml } from '../../lib/email';
import { ReservationService } from '../reservation.service';
import { QueueService } from '../queue.service';
import { CacheService } from '../cache.service';
import { createNotificationSafe } from '../notification.service';
import { runInTransaction } from '../../utils/transaction';
import { cancelBooking, executeCancelBookingSideEffects } from '../admin/booking.service';
import { PublicBookingService } from './booking.service';

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

type PaymentOwnershipContext = {
  userId?: string;
  sessionId?: string;
  trustedInternal?: boolean;
};

export class PaymentService {
  private static assertBookingOwnership(booking: IBooking, ownershipContext: PaymentOwnershipContext): void {
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
    const env = getEnv();
    const isProd = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
    if (!isProd) return;

    const metadata = {
      bookingId: context.bookingId,
      paymentId: context.paymentId,
      environment: env.NODE_ENV || env.APP_ENV,
      requestSource: context.requestSource,
      gateway: context.gateway,
    };

    // Rule 1: Reject env.MOCK_PAYMENTS === true
    if (env.MOCK_PAYMENTS) {
      const errorMsg = 'MOCK_PAYMENTS_PRODUCTION_BLOCKED: Mock payments cannot be enabled in production environments.';
      logger.error(metadata, errorMsg);
      auditLog({
        action: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED',
        status: 'failure',
        description: errorMsg,
        metadata,
      });
      try {
        Sentry.captureException(new Error(errorMsg), {
          tags: { type: 'MOCK_PAYMENTS_PRODUCTION_BLOCKED', environment: metadata.environment, gateway: metadata.gateway },
          extra: metadata,
        });
      } catch (err) {
        logger.error(err, 'Failed to log MOCK_PAYMENTS_PRODUCTION_BLOCKED to Sentry');
      }
      throw new Error(errorMsg);
    }

    if (context.gateway === 'mock') {
      this.assertProductionMockRuntimeBlocked(context);
    }

    // Rule 2: Reject mock identifiers
    const mockPatterns = ['pi_mock_', 'pay_mock_', 'order_mock_', '_secret_mock'];
    for (const id of identifiers) {
      if (!id) continue;
      if (mockPatterns.some((pattern) => id.includes(pattern))) {
        const errorMsg = `MOCK_PAYMENT_IDENTIFIER_DETECTED: Mock payment identifier "${id}" submitted in production.`;
        const localMetadata = { ...metadata, paymentId: id };
        logger.error(localMetadata, errorMsg);
        auditLog({
          action: 'MOCK_PAYMENT_IDENTIFIER_DETECTED',
          status: 'failure',
          description: errorMsg,
          metadata: localMetadata,
        });
        try {
          Sentry.captureException(new Error(errorMsg), {
            tags: { type: 'MOCK_PAYMENT_IDENTIFIER_DETECTED', environment: localMetadata.environment, gateway: localMetadata.gateway },
            extra: localMetadata,
          });
        } catch (err) {
          logger.error(err, 'Failed to log MOCK_PAYMENT_IDENTIFIER_DETECTED to Sentry');
        }
        throw new Error(errorMsg);
      }
    }
  }

  private static assertProductionMockRuntimeBlocked(
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    const env = getEnv();
    const isProd = env.NODE_ENV === 'production' || env.APP_ENV === 'production';
    if (!isProd) return;

    const metadata = {
      bookingId: context.bookingId,
      paymentId: context.paymentId,
      environment: env.NODE_ENV || env.APP_ENV,
      requestSource: context.requestSource,
      gateway: context.gateway,
    };

    const errorMsg = 'MOCK_PAYMENT_RUNTIME_BLOCKED: Mock payment execution path reached in production.';
    logger.error(metadata, errorMsg);
    auditLog({
      action: 'MOCK_PAYMENT_RUNTIME_BLOCKED',
      status: 'failure',
      description: errorMsg,
      metadata,
    });
    try {
      Sentry.captureException(new Error(errorMsg), {
        tags: { type: 'MOCK_PAYMENT_RUNTIME_BLOCKED', environment: metadata.environment, gateway: metadata.gateway },
        extra: metadata,
      });
    } catch (err) {
      logger.error(err, 'Failed to log MOCK_PAYMENT_RUNTIME_BLOCKED to Sentry');
    }
    throw new Error(errorMsg);
  }

  static async createPaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay', ownershipContext: PaymentOwnershipContext = {}) {
    this.assertProductionPaymentIntegrity([bookingId], { bookingId, gateway });

    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    this.assertBookingOwnership(booking, ownershipContext);

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
    }

    const event = await Event.findById(booking.eventId);
    if (!event || event.status !== 'published' || event.isDeleted === true) {
      throw AppError.notFound('Event not found or not published');
    }

    const now = new Date();
    if (now >= new Date(event.startDate) || (event.endDate && now > new Date(event.endDate))) {
      throw AppError.badRequest('This event is no longer available for booking.');
    }

    if (booking.totalAmount === 0) {
      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'free',
        status: PaymentStatus.PAID,
        amount: 0,
        currency: booking.currency || 'INR',
        gatewayOrderId: `free_${crypto.randomBytes(8).toString('hex')}`,
      });
      const confirmedBooking = await this.confirmBooking(booking, payment);
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
        existingPayment.currency === (booking.currency || 'INR') &&
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
            const stripe = getStripe();
            const intent = await stripe.paymentIntents.retrieve(existingPayment.gatewayOrderId!);
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
        existingPayment.failureReason = isExpired ? 'PENDING_INTENT_EXPIRED' : 'PENDING_INTENT_SUPERSEDED';
        await existingPayment.save();
        logger.info(
          { bookingId: booking._id, paymentId: existingPayment._id, reason: existingPayment.failureReason },
          'Stale or mismatched pending payment expired/superseded.'
        );
      }
    }

    if (gateway === 'razorpay') {
      return this.handleRazorpayIntent(booking, env);
    }

    return this.handleStripeIntent(booking, env);
  }

  private static async handleRazorpayIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
    if (env.MOCK_PAYMENTS) {
      this.assertProductionMockRuntimeBlocked({ bookingId: booking._id.toString(), gateway: 'razorpay' });
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 10);
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
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: mockOrderId,
        paymentId: payment._id as any,
        reason: 'mock-razorpay-intent-created',
        correlationId: booking.bookingId,
      });

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
        description: `Created mock Razorpay payment order ${mockOrderId} for booking ${booking.bookingId}`
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

    if (!isRazorpayEnabled()) {
      throw AppError.badRequest('Razorpay is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (amountPaise < 100) {
      throw AppError.badRequest('Amount must be at least 1 INR (100 paise) for Razorpay transactions');
    }

    try {
      const rzp = getRazorpay();
      const order = await rzp.orders.create({
        amount: amountPaise,
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
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: order.id,
        paymentId: payment._id as any,
        reason: 'razorpay-intent-created',
        correlationId: booking.bookingId,
      });

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
        description: `Created Razorpay payment order ${order.id} for booking ${booking.bookingId}`
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
      const description = err.error?.description || err.message || 'Razorpay order creation failed';
      throw new AppError(`Razorpay payment intent failed: ${description}`, statusCode);
    }
  }

  private static async handleStripeIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
    if (env.MOCK_PAYMENTS) {
      this.assertProductionMockRuntimeBlocked({ bookingId: booking._id.toString(), gateway: 'stripe' });
      const mockIntentId = 'pi_mock_' + Math.random().toString(36).substring(2, 10);
      const payment = await this.createPendingPayment(
        booking._id,
        'stripe',
        booking.totalAmount,
        booking.currency || 'INR',
        booking.couponId,
        mockIntentId
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: mockIntentId,
        paymentId: payment._id as any,
        reason: 'mock-stripe-intent-created',
        correlationId: booking.bookingId,
      });

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
        description: `Created mock Stripe payment intent ${mockIntentId} for booking ${booking.bookingId}`
      });

      return {
        gateway: 'stripe',
        publishableKey: env.STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy',
        clientSecret: mockIntentId + '_secret_' + Math.random().toString(36).substring(2, 10),
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        bookingId: booking._id,
        isMock: true,
      };
    }

    if (!isStripeEnabled()) {
      throw AppError.badRequest('Stripe is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountPaise,
        currency: booking.currency?.toLowerCase() || 'inr',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          environment: getEnv().NODE_ENV,
        },
      });

      const payment = await this.createPendingPayment(
        booking._id,
        'stripe',
        booking.totalAmount,
        booking.currency || 'INR',
        booking.couponId,
        paymentIntent.id
      );

      booking.paymentId = payment._id as any;
      booking.bookingVersion += 1;
      await booking.save();
      await ReservationService.transitionForBooking(booking._id, ReservationStatus.PENDING_PAYMENT, {
        paymentReference: paymentIntent.id,
        paymentId: payment._id as any,
        reason: 'stripe-intent-created',
        correlationId: booking.bookingId,
      });

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
        description: `Created Stripe payment intent ${paymentIntent.id} for booking ${booking.bookingId}`
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
      throw new AppError(`Stripe payment intent failed: ${description}`, statusCode);
    }
  }

  /**
   * PR-03 — Razorpay Webhook Confirmation Path
   *
   * Called by the Razorpay webhook handler AFTER the webhook HMAC signature has
   * already been verified against RAZORPAY_WEBHOOK_SECRET at the controller layer.
   *
   * Why this is a separate method from verifyPayment():
   * - verifyPayment() is the FRONTEND path. It re-verifies the Razorpay payment
   *   signature using RAZORPAY_KEY_SECRET (the checkout redirect credential).
   * - confirmFromWebhook() is the WEBHOOK path. The webhook body is already
   *   authenticated via HMAC at the HTTP layer — no second signature check needed.
   *   Requiring the checkout signature here would make the webhook unimplementable.
   *
   * Both paths share the same confirmBooking() and failPaymentAndReleaseInventory()
   * internals, so there is exactly one confirmation code path regardless of source.
   *
   * @param razorpayOrderId  - from webhook payload.payment.entity.order_id
   * @param razorpayPaymentId - from webhook payload.payment.entity.id
   * @param eventType        - Razorpay webhook event name (e.g. 'payment.captured')
   * @param webhookEventId   - x-razorpay-event-id header (for audit logging)
   */
  static async confirmFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    eventType: string,
    webhookEventId: string,
    amountPaise?: number,
    currency?: string
  ): Promise<{ status: 'confirmed' | 'failed' | 'skipped'; bookingId?: string }> {
    this.assertProductionPaymentIntegrity(
      [razorpayOrderId, razorpayPaymentId],
      {
        paymentId: razorpayPaymentId,
        gateway: 'razorpay',
        requestSource: 'webhook',
      }
    );

    // 1. Resolve Payment record from orderId — this is the only link between the
    //    webhook payload and the internal booking.
    const payment = await Payment.findOne({ gatewayOrderId: razorpayOrderId, gateway: 'razorpay' });

    if (!payment) {
      // Order not found — either the payment was created outside this system or
      // the webhook arrived before the Payment record was written. Log and skip;
      // do not fail the webhook (Razorpay will not retry on 200).
      logger.warn(
        { razorpayOrderId, razorpayPaymentId, webhookEventId, eventType },
        'PR-03: Razorpay webhook received but no matching Payment record found for orderId'
      );
      return { status: 'skipped' };
    }

    // 2. Resolve Booking from Payment.
    const booking = await Booking.findById(payment.bookingId);

    if (!booking) {
      logger.error(
        { razorpayOrderId, razorpayPaymentId, paymentId: payment._id, webhookEventId },
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

    // 3. Idempotency guard at the payment level.
    //    WebhookEvent deduplication in the controller prevents duplicate event
    //    delivery. This guard catches the race window where frontend and webhook
    //    both try to confirm simultaneously.
    if (payment.status === PaymentStatus.PAID) {
      logger.info(
        { razorpayOrderId, razorpayPaymentId, bookingId: booking._id, webhookEventId },
        'PR-03: Payment already confirmed — webhook idempotency skip'
      );
      return { status: 'skipped', bookingId: booking._id.toString() };
    }

    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      payment.gatewayPaymentId = razorpayPaymentId;
      payment.paidAt = new Date();

      // confirmBooking() uses findOneAndUpdate with { status: AWAITING_PAYMENT } guard.
      // If the booking expired or was already confirmed by the frontend, this is a no-op.
      const confirmedBooking = await this.confirmBooking(booking, payment);

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
        description: `Confirmed Razorpay payment ${razorpayPaymentId} via webhook event ${eventType} for booking ${booking.bookingId}`
      });

      return { status: 'confirmed', bookingId: booking._id.toString() };
    }

    if (eventType === 'payment.failed') {
      await this.failPaymentAndReleaseInventory(booking, payment, `Razorpay webhook: ${eventType}`);

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
        description: `Failed Razorpay payment ${razorpayPaymentId} via webhook event ${eventType} for booking ${booking.bookingId} - inventory released`
      });

      return { status: 'failed', bookingId: booking._id.toString() };
    }

    // Unhandled event type — log and ack so Razorpay does not retry.
    logger.debug(
      { razorpayOrderId, razorpayPaymentId, webhookEventId, eventType },
      'PR-03: Razorpay webhook event type not actionable — acknowledging without processing'
    );
    return { status: 'skipped' };
  }

  static async confirmFromWebhookStripe(
    intent: {
      id: string;
      metadata?: { bookingId?: string; bookingReference?: string };
      amount?: number;
      amount_received?: number;
      currency?: string;
    },
    webhookEventId: string
  ): Promise<{ status: 'confirmed' | 'skipped' | 'failed'; bookingId?: string }> {
    this.assertProductionPaymentIntegrity(
      [intent.id],
      {
        bookingId: intent.metadata?.bookingId,
        paymentId: intent.id,
        gateway: 'stripe',
        requestSource: 'webhook',
      }
    );

    try {
      const intentBookingId = intent.metadata?.bookingId;
      if (!intentBookingId) {
        logger.warn(
          { paymentIntentId: intent.id, webhookEventId },
          'Stripe webhook received but missing bookingId metadata'
        );
        return { status: 'skipped' };
      }

      // 2. Resolve Payment record
      const payment = await Payment.findOne({ gatewayOrderId: intent.id, gateway: 'stripe' });
      if (!payment) {
        logger.warn(
          { paymentIntentId: intent.id, webhookEventId },
          'Stripe webhook received but no matching Payment record found'
        );
        return { status: 'skipped' };
      }

      // 3. Resolve Booking from payment.bookingId
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

      // 5. Optimistic idempotency read
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
        // Validation check 1: bookingId metadata must match
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
          await this.failPaymentAndReleaseInventory(booking, payment, `Stripe webhook metadata mismatch: bookingId`, 'auto_recovery', 'BOOKING_ID_MISMATCH');
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
            description: `SECURITY VIOLATION: Stripe webhook bookingId mismatch for booking ${booking.bookingId}`
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        // Validation check 2: bookingReference metadata must match
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
          await this.failPaymentAndReleaseInventory(booking, payment, `Stripe webhook metadata mismatch: bookingReference`, 'auto_recovery', 'BOOKING_REFERENCE_MISMATCH');
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
            description: `SECURITY VIOLATION: Stripe webhook bookingReference mismatch for booking ${booking.bookingId}`
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        // 6. Amount validation (defense-in-depth)
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
          await this.failPaymentAndReleaseInventory(booking, payment, `Amount mismatch: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise}`, 'auto_recovery', 'AMOUNT_MISMATCH');
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
            description: `SECURITY VIOLATION: Stripe webhook payment amount mismatch for booking ${booking.bookingId}`
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }

        // 7. Currency validation (defense-in-depth)
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
            await this.failPaymentAndReleaseInventory(booking, payment, `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`, 'auto_recovery', 'CURRENCY_MISMATCH');
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
              description: `SECURITY VIOLATION: Stripe webhook payment currency mismatch for booking ${booking.bookingId}`
            });
            return { status: 'skipped', bookingId: booking._id.toString() };
          }
        }
      }

      payment.gatewayPaymentId = intent.id;
      payment.paidAt = new Date();

      // 9. confirmBooking(booking, payment)
      const confirmedBooking = await this.confirmBooking(booking, payment);
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

      // 10. Log and auditLog PAYMENT_WEBHOOK_CONFIRMED
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
        description: `Confirmed Stripe payment ${intent.id} via webhook for booking ${booking.bookingId}`
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

  static async verifyPayment(
    bookingId: string,
    gatewayPayload: any,
    ownershipContext: PaymentOwnershipContext = {}
  ) {

    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const { paymentIntentId, razorpay_order_id, razorpay_payment_id } = gatewayPayload || {};

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
      throw AppError.badRequest('Payment verification requires a payment identifier');
    }

    if (!payment) {
      throw AppError.notFound('Payment record not found for booking');
    }

    // BUG-297: If the webhook already confirmed this payment, bypass assertBookingOwnership()
    // ONLY after the full gateway cryptographic proof has been validated.
    // This resolves the race condition where the webhook arrives first, links booking.userId
    // to a registered user, and the frontend request then fails ownership with a rotated session.
    //
    // assertBookingOwnership() remains fully enforced for all PENDING (unconfirmed) payments below.
    if (payment.status === PaymentStatus.PAID) {
      await this.validateGatewayProof(booking, payment, gatewayPayload, getEnv());
      return booking;
    }

    // Payment is not yet confirmed — enforce standard session / user ownership.
    this.assertBookingOwnership(booking, ownershipContext);

    const event = await Event.findById(booking.eventId);
    if (!event || event.status !== 'published' || event.isDeleted === true) {
      throw AppError.notFound('Event not found or not published');
    }

    const now = new Date();
    if (now >= new Date(event.startDate) || (event.endDate && now > new Date(event.endDate))) {
      await this.failPaymentAndReleaseInventory(
        booking,
        payment,
        'Event has already started or ended.',
        'auto_recovery',
        'PAYMENT_VALIDATION_FAILURE'
      );
      throw AppError.badRequest('This event is no longer available for booking.');
    }

    const env = getEnv();
    let confirmedBooking: IBooking | null = null;

    if (payment.gateway === 'razorpay') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw AppError.badRequest('Missing Razorpay credentials in payment payload');
      }

      const isMock = env.MOCK_PAYMENTS && razorpay_payment_id.startsWith('pay_mock_') && razorpay_signature === 'mock_signature';

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: razorpay_payment_id,
          gateway: 'razorpay',
          requestSource: 'frontend_verify',
        });
      }

      if (!payment.gatewayOrderId || payment.gatewayOrderId !== razorpay_order_id) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            expectedOrderId: payment.gatewayOrderId,
            receivedOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
          },
          'SECURITY: Razorpay order ID mismatch — possible payment replay attack'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            expectedOrderId: payment.gatewayOrderId,
            receivedOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            violationType: 'razorpay_order_mismatch',
            isMock,
          },
          description: `SECURITY VIOLATION: Razorpay order mismatch for booking ${booking.bookingId}`
        });

        throw AppError.badRequest('Razorpay order does not belong to this booking');
      }

      if (!isMock) {
        const text = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
          .update(text)
          .digest('hex');

        if (expectedSignature !== razorpay_signature) {
          await this.failPaymentAndReleaseInventory(booking, payment, 'Signature verification failed');
          auditLog({
            action: 'PAYMENT_VERIFICATION_FAILED',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              reason: 'Signature verification failed',
            },
            description: `Failed Razorpay payment signature check for booking ${booking.bookingId}`
          });

          throw AppError.badRequest('Razorpay signature verification failed');
        }
      }

      const duplicateGatewayPayment = await Payment.findOne({
        gateway: 'razorpay',
        gatewayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      });

      if (duplicateGatewayPayment) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            duplicatePaymentId: duplicateGatewayPayment._id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
          },
          'SECURITY: Razorpay payment ID already attached to another payment'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            paymentId: payment._id?.toString(),
            duplicatePaymentId: duplicateGatewayPayment._id?.toString(),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            violationType: 'razorpay_payment_id_duplicate',
            isMock,
          },
          description: `SECURITY VIOLATION: Razorpay payment ID replay for booking ${booking.bookingId}`
        });

        throw AppError.badRequest('Razorpay payment has already been used');
      }

      // Amount & currency verification (defense-in-depth sanity checks)
      if (payment.amount !== undefined && booking.totalAmount !== undefined) {
        const expectedAmountPaise = Math.round(booking.totalAmount * 100);
        const paymentAmountPaise = Math.round(payment.amount * 100);

        if (paymentAmountPaise !== expectedAmountPaise) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentId: payment._id,
              expectedAmountPaise,
              paymentAmountPaise,
            },
            'SECURITY: Razorpay payment amount mismatch'
          );
          await this.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Amount mismatch: expected ${expectedAmountPaise} paise, got payment record with ${paymentAmountPaise} paise`
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedAmountPaise,
              receivedAmountPaise: paymentAmountPaise,
              violationType: 'amount_mismatch',
            },
            description: `SECURITY VIOLATION: Razorpay payment amount mismatch for booking ${booking.bookingId}`
          });
          throw AppError.badRequest('Payment amount does not match booking total');
        }
      }

      if (payment.currency !== undefined && booking.currency !== undefined) {
        const expectedCurrency = (booking.currency || 'INR').toLowerCase();
        const paymentCurrency = (payment.currency || 'INR').toLowerCase();
        if (paymentCurrency !== expectedCurrency) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentId: payment._id,
              expectedCurrency,
              paymentCurrency,
            },
            'SECURITY: Razorpay payment currency mismatch'
          );
          await this.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Currency mismatch: expected ${expectedCurrency}, got payment record with ${paymentCurrency}`
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedCurrency,
              receivedCurrency: paymentCurrency,
              violationType: 'currency_mismatch',
            },
            description: `SECURITY VIOLATION: Razorpay payment currency mismatch for booking ${booking.bookingId}`
          });
          throw AppError.badRequest('Payment currency does not match booking currency');
        }
      }

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
          : `Verified Razorpay payment ${razorpay_payment_id} for booking ${booking.bookingId}`
      });

      confirmedBooking = await this.confirmBooking(booking, payment);
    } else {
      // ── Stripe verification (PR-02 hardened) ──────────────────────────────────
      const { paymentIntentId } = gatewayPayload;
      if (!paymentIntentId) {
        throw AppError.badRequest('Missing Stripe paymentIntentId in payment payload');
      }

      const isMock = env.MOCK_PAYMENTS && paymentIntentId.startsWith('pi_mock_');

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: paymentIntentId,
          gateway: 'stripe',
          requestSource: 'frontend_verify',
        });
      }

      if (isMock) {
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
            isMock: true,
          },
          description: `Verified mock Stripe payment intent ${paymentIntentId} for booking ${booking.bookingId}`
        });

        confirmedBooking = await this.confirmBooking(booking, payment);
      } else {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // 1. Status check — only 'succeeded' is a valid terminal state for confirmation.
        //    Reject processing, requires_action, canceled, requires_payment_method, expired.
        if (intent.status !== 'succeeded') {
          logger.warn(
            { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, intentStatus: intent.status },
            'Stripe verification rejected: intent not in succeeded state'
          );
          await this.failPaymentAndReleaseInventory(booking, payment, `Stripe status: ${intent.status}`);
          auditLog({
            action: 'PAYMENT_VERIFICATION_FAILED',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'stripe',
              reason: `Stripe intent status: ${intent.status}`,
            },
            description: `Stripe verification failed: intent status is ${intent.status} for booking ${booking.bookingId}`
          });

          throw AppError.badRequest(`Stripe payment verification failed. Status is "${intent.status}"`);
        }

        // 2. Booking binding check — the intent MUST have been created for THIS booking.
        //    Prevents cross-booking replay: attacker cannot use their own succeeded intent
        //    to confirm a victim's booking.
        const intentBookingId = intent.metadata?.bookingId;
        const intentBookingReference = intent.metadata?.bookingReference;

        if (intentBookingId !== booking._id.toString()) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId,
              intentBookingId,
              intentBookingReference,
            },
            'SECURITY: Stripe intent bookingId metadata mismatch — possible replay attack'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'stripe',
              intentBookingId,
              intentBookingReference,
              violationType: 'booking_id_mismatch',
            },
            description: `SECURITY VIOLATION: Stripe intent bookingId mismatch for booking ${booking.bookingId}`
          });

          throw AppError.badRequest('Stripe payment intent does not belong to this booking');
        }

        // 3. Secondary reference binding — confirms the intent was created in our system,
        //    not crafted externally with only a matching bookingId.
        if (intentBookingReference && intentBookingReference !== booking.bookingId) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId,
              intentBookingReference,
            },
            'SECURITY: Stripe intent bookingReference metadata mismatch'
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
            description: `SECURITY VIOLATION: Stripe intent bookingReference mismatch for booking ${booking.bookingId}`
          });

          throw AppError.badRequest('Stripe payment intent booking reference mismatch');
        }

        // 4. Amount validation — integer-safe paise comparison.
        //    Underpayment and overpayment are both rejected.
        const expectedAmountPaise = Math.round(booking.totalAmount * 100);
        const receivedAmountPaise = intent.amount_received ?? 0;

        if (receivedAmountPaise !== expectedAmountPaise) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId,
              expectedAmountPaise,
              receivedAmountPaise,
            },
            'SECURITY: Stripe payment amount mismatch'
          );
          await this.failPaymentAndReleaseInventory(booking, payment, `Amount mismatch: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise}`, 'auto_recovery', 'AMOUNT_MISMATCH');
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
            description: `SECURITY VIOLATION: Stripe payment amount mismatch for booking ${booking.bookingId}`
          });

          throw AppError.badRequest('Payment amount does not match booking total');
        }

        // 5. Currency validation — case-insensitive.
        const expectedCurrency = (booking.currency || 'INR').toLowerCase();
        const receivedCurrency = (intent.currency || '').toLowerCase();

        if (receivedCurrency !== expectedCurrency) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentIntentId,
              expectedCurrency,
              receivedCurrency,
            },
            'SECURITY: Stripe payment currency mismatch'
          );
          await this.failPaymentAndReleaseInventory(booking, payment, `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`, 'auto_recovery', 'CURRENCY_MISMATCH');
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
            description: `SECURITY VIOLATION: Stripe payment currency mismatch for booking ${booking.bookingId}`
          });

          throw AppError.badRequest('Payment currency does not match booking currency');
        }

        // All checks passed — record payment and confirm booking.
        logger.info(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentIntentId,
            amountPaise: receivedAmountPaise,
            currency: receivedCurrency,
          },
          'Stripe payment verification passed all binding checks'
        );

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
          },
          description: `Verified Stripe payment intent ${paymentIntentId} for booking ${booking.bookingId}`
        });

        confirmedBooking = await this.confirmBooking(booking, payment);
      }
    }

    if (confirmedBooking) {
      return confirmedBooking;
    }

    const latestBooking = await Booking.findById(booking._id);
    return latestBooking || booking;
  }

  /**
   * BUG-297 — Validates cryptographic gateway proof for an already-PAID payment.
   *
   * Called exclusively by verifyPayment() when payment.status === PAID, allowing
   * assertBookingOwnership() to be bypassed safely. The webhook may have confirmed
   * the payment first and mutated booking.userId, rendering the caller's session or
   * userId context stale — but the gateway proof is an unambiguous identity assertion.
   *
   * Security contract:
   *  - No state mutations (no payment saves, no failPaymentAndReleaseInventory).
   *  - No confirmBooking() calls.
   *  - Every check that is enforced in the normal PENDING path is enforced here.
   *  - Throws on any failure; never silently allows access.
   *
   * Stripe checks (8): paymentIntentId present, mock guard, retrieve from API,
   *   status === succeeded, bookingId binding, bookingReference binding, amount, currency.
   *
   * Razorpay checks (7): credentials present, mock guard, order ID binding,
   *   HMAC-SHA256 signature, payment ID replay, amount, currency.
   */
  private static async validateGatewayProof(
    booking: IBooking,
    payment: IPayment,
    gatewayPayload: any,
    env: ReturnType<typeof getEnv>
  ): Promise<void> {
    if (payment.gateway === 'razorpay') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw AppError.badRequest('Missing Razorpay credentials in payment payload');
      }

      const isMock = env.MOCK_PAYMENTS && razorpay_payment_id.startsWith('pay_mock_') && razorpay_signature === 'mock_signature';

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: razorpay_payment_id,
          gateway: 'razorpay',
          requestSource: 'frontend_verify',
        });
      }

      // Order ID binding — the submitted order must match the payment record created for this booking.
      if (!payment.gatewayOrderId || payment.gatewayOrderId !== razorpay_order_id) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            expectedOrderId: payment.gatewayOrderId,
            receivedOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
          },
          'SECURITY: Razorpay order ID mismatch on PAID path — possible payment replay attack'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            expectedOrderId: payment.gatewayOrderId,
            receivedOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            violationType: 'razorpay_order_mismatch',
            paidPath: true,
            isMock,
          },
          description: `SECURITY VIOLATION: Razorpay order mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Razorpay order does not belong to this booking');
      }

      // HMAC-SHA256 signature validation — proves the caller possesses the frontend checkout credentials.
      if (!isMock) {
        const text = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
          .update(text)
          .digest('hex');

        if (expectedSignature !== razorpay_signature) {
          auditLog({
            action: 'PAYMENT_VERIFICATION_FAILED',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              reason: 'Signature verification failed (PAID path)',
            },
            description: `Failed Razorpay payment signature check on PAID path for booking ${booking.bookingId}`
          });
          throw AppError.badRequest('Razorpay signature verification failed');
        }
      }

      // Replay protection — no other payment record may claim this gatewayPaymentId.
      const duplicateGatewayPayment = await Payment.findOne({
        gateway: 'razorpay',
        gatewayPaymentId: razorpay_payment_id,
        _id: { $ne: payment._id },
      });

      if (duplicateGatewayPayment) {
        logger.error(
          {
            bookingId: booking._id,
            bookingReference: booking.bookingId,
            paymentId: payment._id,
            duplicatePaymentId: duplicateGatewayPayment._id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
          },
          'SECURITY: Razorpay payment ID already attached to another payment (PAID path)'
        );
        auditLog({
          action: 'PAYMENT_SECURITY_VIOLATION',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'razorpay',
            paymentId: payment._id?.toString(),
            duplicatePaymentId: duplicateGatewayPayment._id?.toString(),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            violationType: 'razorpay_payment_id_duplicate',
            paidPath: true,
            isMock,
          },
          description: `SECURITY VIOLATION: Razorpay payment ID replay on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Razorpay payment has already been used');
      }

      // Amount validation — defense-in-depth against payment record tampering.
      if (payment.amount !== undefined && booking.totalAmount !== undefined) {
        const expectedAmountPaise = Math.round(booking.totalAmount * 100);
        const paymentAmountPaise = Math.round(payment.amount * 100);
        if (paymentAmountPaise !== expectedAmountPaise) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentId: payment._id,
              expectedAmountPaise,
              paymentAmountPaise,
            },
            'SECURITY: Razorpay payment amount mismatch (PAID path)'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedAmountPaise,
              receivedAmountPaise: paymentAmountPaise,
              violationType: 'amount_mismatch',
              paidPath: true,
            },
            description: `SECURITY VIOLATION: Razorpay payment amount mismatch on PAID path for booking ${booking.bookingId}`
          });
          throw AppError.badRequest('Payment amount does not match booking total');
        }
      }

      // Currency validation — defense-in-depth.
      if (payment.currency !== undefined && booking.currency !== undefined) {
        const expectedCurrency = (booking.currency || 'INR').toLowerCase();
        const paymentCurrency = (payment.currency || 'INR').toLowerCase();
        if (paymentCurrency !== expectedCurrency) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              paymentId: payment._id,
              expectedCurrency,
              paymentCurrency,
            },
            'SECURITY: Razorpay payment currency mismatch (PAID path)'
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedCurrency,
              receivedCurrency: paymentCurrency,
              violationType: 'currency_mismatch',
              paidPath: true,
            },
            description: `SECURITY VIOLATION: Razorpay payment currency mismatch on PAID path for booking ${booking.bookingId}`
          });
          throw AppError.badRequest('Payment currency does not match booking currency');
        }
      }

    } else {
      // ── Stripe ────────────────────────────────────────────────────────────────
      const { paymentIntentId } = gatewayPayload || {};

      if (!paymentIntentId) {
        throw AppError.badRequest('Missing Stripe paymentIntentId in payment payload');
      }

      const isMock = env.MOCK_PAYMENTS && paymentIntentId.startsWith('pi_mock_');

      if (isMock) {
        this.assertProductionMockRuntimeBlocked({
          bookingId: booking._id.toString(),
          paymentId: paymentIntentId,
          gateway: 'stripe',
          requestSource: 'frontend_verify',
        });
        // Mock path: no Stripe API call — proof is the pi_mock_ prefix under MOCK_PAYMENTS.
        return;
      }

      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // 1. Status — only 'succeeded' is a valid terminal state.
      if (intent.status !== 'succeeded') {
        logger.warn(
          { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, intentStatus: intent.status },
          'Stripe verification rejected on PAID path: intent not in succeeded state'
        );
        auditLog({
          action: 'PAYMENT_VERIFICATION_FAILED',
          status: 'failure',
          metadata: {
            bookingId: booking._id.toString(),
            bookingReference: booking.bookingId,
            gateway: 'stripe',
            reason: `Stripe intent status: ${intent.status} (PAID path)`,
          },
          description: `Stripe verification failed on PAID path: intent status is ${intent.status} for booking ${booking.bookingId}`
        });
        throw AppError.badRequest(`Stripe payment verification failed. Status is "${intent.status}"`);
      }

      // 2. bookingId binding — the intent must have been created for THIS booking.
      const intentBookingId = intent.metadata?.bookingId;
      const intentBookingReference = intent.metadata?.bookingReference;

      if (intentBookingId !== booking._id.toString()) {
        logger.error(
          { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, intentBookingId },
          'SECURITY: Stripe intent bookingId metadata mismatch on PAID path — possible replay attack'
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
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Stripe intent bookingId mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Stripe payment intent does not belong to this booking');
      }

      // 3. bookingReference binding — secondary reference confirms our system created the intent.
      if (intentBookingReference && intentBookingReference !== booking.bookingId) {
        logger.error(
          { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, intentBookingReference },
          'SECURITY: Stripe intent bookingReference metadata mismatch on PAID path'
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
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Stripe intent bookingReference mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Stripe payment intent booking reference mismatch');
      }

      // 4. Amount validation — integer-safe paise comparison.
      const expectedAmountPaise = Math.round(booking.totalAmount * 100);
      const receivedAmountPaise = intent.amount_received ?? 0;

      if (receivedAmountPaise !== expectedAmountPaise) {
        logger.error(
          { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, expectedAmountPaise, receivedAmountPaise },
          'SECURITY: Stripe payment amount mismatch on PAID path'
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
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Stripe payment amount mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Payment amount does not match booking total');
      }

      // 5. Currency validation — case-insensitive.
      const expectedCurrency = (booking.currency || 'INR').toLowerCase();
      const receivedCurrency = (intent.currency || '').toLowerCase();

      if (receivedCurrency !== expectedCurrency) {
        logger.error(
          { bookingId: booking._id, bookingReference: booking.bookingId, paymentIntentId, expectedCurrency, receivedCurrency },
          'SECURITY: Stripe payment currency mismatch on PAID path'
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
            paidPath: true,
          },
          description: `SECURITY VIOLATION: Stripe payment currency mismatch on PAID path for booking ${booking.bookingId}`
        });
        throw AppError.badRequest('Payment currency does not match booking currency');
      }
    }
  }

  private static safeEmit(label: string, emit: () => void, data: Record<string, unknown>) {
    try {
      emit();
    } catch (err) {
      logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
    }
  }

  private static async redeemCouponForConfirmedBooking(booking: IBooking, payment: IPayment, session?: ClientSession): Promise<void> {
    if (!booking.couponId) {
      return;
    }

    const result = await Coupon.updateOne(
      {
        _id: booking.couponId,
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
      },
      { $inc: { usedCount: 1 } },
      { session }
    );

    if (result.modifiedCount !== 1) {
      logger.warn(
        {
          bookingId: booking._id,
          bookingReference: booking.bookingId,
          paymentId: payment._id,
          couponId: booking.couponId,
        },
        'Coupon redemption rejected because usage limit has been reached'
      );

      const err = AppError.conflict('Coupon usage limit reached');
      err.code = 'COUPON_USAGE_LIMIT_REACHED';
      throw err;
    }
  }

  private static async triggerRefundRequest(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    session?: ClientSession,
    origin: 'manual' | 'auto_recovery' = 'manual',
    recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ): Promise<void> {
    const idempotencyKey = `auto-refund-${payment._id}`;

    const existingRefund = await Refund.findOne({
      paymentId: payment._id,
      status: { $in: ['requested', 'processing', 'completed'] }
    }).session(session || null);

    if (!existingRefund) {
      try {
        await Refund.create([{
          bookingId: booking._id,
          paymentId: payment._id,
          amount: booking.totalAmount,
          currency: booking.currency || 'INR',
          reason: reason || 'LATE_PAYMENT_RECOVERY_REJECTED',
          status: 'requested',
          idempotencyKey,
          origin,
          recoveryReason,
        }], { session });
        logger.info(
          { bookingId: booking._id, paymentId: payment._id, amount: booking.totalAmount, reason, idempotencyKey, origin, recoveryReason },
          'Created automatic Refund request record due to validation mismatch / recovery'
        );
      } catch (err: any) {
        const isDuplicateKey = err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');
        if (isDuplicateKey) {
          logger.warn(
            { paymentId: payment._id, idempotencyKey },
            'Duplicate refund request creation race detected. Handled idempotently.'
          );
        } else {
          throw err;
        }
      }
    }
  }

  private static async failPaymentAndReleaseInventory(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    origin?: 'manual' | 'auto_recovery',
    recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ) {
    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

    if (origin === 'auto_recovery') {
      await this.triggerRefundRequest(booking, payment, reason, undefined, origin, recoveryReason).catch(() => {});
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      logger.info(
        {
          bookingId: booking._id,
          bookingStatus: booking.status,
          paymentId: payment._id,
        },
        'Skipping booking failure transition and inventory release for already-processed booking'
      );
      return;
    }

    booking.status = BookingStatus.FAILED;
    booking.bookingVersion += 1;
    await booking.save();
    const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
      paymentReference: payment.gatewayPaymentId ?? payment.gatewayOrderId,
      paymentId: payment._id as any,
      reason,
      correlationId: booking.bookingId,
    });
    await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

    // Asynchronous, exception-safe Payment Failure Email Trigger
    if (booking.guestEmail) {
      try {
        const existingNotification = await Notification.findOne({
          jobId: `payfail-${payment._id}`
        });

        if (!existingNotification) {
          const event = await Event.findById(booking.eventId);
          const emailBody = await paymentFailureHtml({
            customerName: booking.guestName,
            eventTitle: event?.title || 'MAD Event',
            bookingReference: booking.bookingId,
            retryUrl: `${getEnv().FRONTEND_URL || 'http://localhost:3000'}/checkout/${booking.bookingId}`,
          });

          const jobId = `payfail-${payment._id}`;

          await createNotificationSafe({
            jobId,
            status: 'queued',
            queuedAt: new Date(),
            type: NotificationType.PAYMENT_FAILED,
            channel: 'email',
            recipient: booking.guestEmail,
            subject: `Payment Failed for ${event?.title || 'MAD Event'}`,
            isSent: false,
            retryCount: 0,
            bookingId: booking._id,
            eventId: event?._id
          });

          await QueueService.enqueue(
            getQueueName('notification-queue'),
            'email-dispatch',
            {
              to: booking.guestEmail,
              subject: `Payment Failed for ${event?.title || 'MAD Event'}`,
              html: emailBody,
              notificationType: NotificationType.PAYMENT_FAILED,
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
            },
            jobId
          );

          logger.info({
            emailType: 'PAYMENT_FAILED',
            recipient: booking.guestEmail,
            bookingId: booking._id.toString(),
            eventId: booking.eventId.toString(),
            timestamp: new Date().toISOString(),
            success: true
          }, 'Payment failure email queued successfully.');
        } else {
          logger.info({ bookingId: booking._id, paymentId: payment._id }, 'Payment failure email already queued or sent; skipping duplicate.');
        }
      } catch (err) {
        logger.error({
          err,
          emailType: 'PAYMENT_FAILED',
          recipient: booking.guestEmail,
          bookingId: booking._id.toString(),
          eventId: booking.eventId.toString(),
          timestamp: new Date().toISOString(),
          success: false
        }, 'Failed to queue payment failure email gracefully.');
      }
    }

    const event = await Event.findById(booking.eventId);
    const releasedSeatIds: string[] = [];

    if (event && event.bookingMode === 'seat_based') {
      const allSeatIds = booking.tickets.flatMap((ticket) => ticket.seats || []).map((seat) => seat.seatId);
      if (allSeatIds.length > 0) {
        await SeatLayout.updateOne(
          { eventId: event._id },
          {
            $set: {
              'seats.$[seat].status': SeatStatus.AVAILABLE,
            },
            $unset: {
              'seats.$[seat].lockedBy': '',
              'seats.$[seat].lockedAt': '',
              'seats.$[seat].bookedByBookingId': '',
              'seats.$[seat].reservationId': '',
            },
            $inc: {
              'seats.$[seat].seatVersion': 1,
            },
          },
          {
            arrayFilters: [
              {
                'seat.seatId': { $in: allSeatIds },
                'seat.status': SeatStatus.LOCKED,
                'seat.bookedByBookingId': booking._id.toString(),
              },
            ],
          }
        );
        releasedSeatIds.push(...allSeatIds);
      }
    }

    if (event && releasedSeatIds.length > 0) {
      this.safeEmit(
        'seat:unlocked',
        () => emitToEvent(event._id.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }, booking.bookingId),
        { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: releasedSeatIds }
      );
    }

    this.safeEmit(
      'booking:updated',
      () => emitToBooking(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin booking:updated',
      () => emitToAdmin('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );

    logger.info({ bookingId: booking._id, paymentId: payment._id, releasedSeatIds, reason }, 'Payment failed and reserved inventory released');
  }

  private static async confirmBooking(booking: IBooking, _payment: IPayment): Promise<IBooking | null> {
    const previousStatus = booking.status;
    if (![BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING].includes(previousStatus)) {
      if (previousStatus === BookingStatus.CONFIRMED && booking.paymentId && booking.paymentId.toString() !== _payment._id.toString()) {
        logger.warn(
          { bookingId: booking._id, incomingPaymentId: _payment._id, winningPaymentId: booking.paymentId },
          'Duplicate payment detected on already confirmed booking. Marking payment as FAILED and triggering refund.'
        );
        _payment.status = PaymentStatus.FAILED;
        _payment.failureReason = 'DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING';
        _payment.failedAt = new Date();
        await _payment.save();
        await this.triggerRefundRequest(booking, _payment, _payment.failureReason).catch(() => {});
      }
      return booking;
    }

    const isLateRecovery = previousStatus === BookingStatus.EXPIRED || previousStatus === BookingStatus.EXPIRING;
    const event = await Event.findById(booking.eventId);
    if (!event) {
      return null;
    }

    const allSeatIds = booking.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);

    let transactionResult;
    try {
      transactionResult = await runInTransaction(async (session) => {
        // 0. Atomic payment status transition inside transaction
        let claimedPayment = _payment;
        if (_payment.status === PaymentStatus.PENDING) {
          claimedPayment = await Payment.findOneAndUpdate(
            { _id: _payment._id, status: PaymentStatus.PENDING },
            {
              $set: {
                status: PaymentStatus.PAID,
                gatewayPaymentId: _payment.gatewayPaymentId,
                gatewaySignature: _payment.gatewaySignature,
                paidAt: _payment.paidAt || new Date(),
              }
            },
            { new: true, session }
          );

          if (!claimedPayment) {
            throw new Error('PAYMENT_ALREADY_CLAIMED_OR_NOT_PENDING');
          }

          // Sync back memory object status
          _payment.status = PaymentStatus.PAID;
          _payment.gatewayPaymentId = claimedPayment.gatewayPaymentId;
          _payment.gatewaySignature = claimedPayment.gatewaySignature;
          _payment.paidAt = claimedPayment.paidAt;
        }

        // Check event start/end date constraints
        const now = new Date();
        if (now >= new Date(event.startDate) || (event.endDate && now > new Date(event.endDate))) {
          throw new Error('EVENT_EXPIRED_DURING_CONFIRMATION');
        }

        // 1. Pre-validation for Late Recovery
        if (isLateRecovery) {
          // Validate general capacity
          if (event.soldCount + event.reservedCount + booking.totalTickets > event.totalCapacity) {
            _payment.status = PaymentStatus.FAILED;
            _payment.failedAt = new Date();
            _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED';
            await _payment.save({ session });
            await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session, 'auto_recovery', 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE');
            return { success: false, booking: null };
          }

          // Validate tier capacity
          for (const bookedTicket of booking.tickets) {
            const tierConfig = event.ticketTiers.find((t) => t.tier === bookedTicket.tier);
            if (!tierConfig) {
              _payment.status = PaymentStatus.FAILED;
              _payment.failedAt = new Date();
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_INVALID_TIER';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session, 'auto_recovery', 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE');
              return { success: false, booking: null };
            }

            // Fetch active reservations count for this specific tier
            const activeTierAgg = await Reservation.aggregate([
              {
                $match: {
                  eventId: event._id,
                  tier: bookedTicket.tier,
                  status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }
                }
              },
              { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).session(session);
            const tierReserved = activeTierAgg[0]?.total ?? 0;

            if (tierConfig.soldCount + tierReserved + bookedTicket.quantity * (tierConfig.groupSize || 1) > tierConfig.totalCapacity) {
              _payment.status = PaymentStatus.FAILED;
              _payment.failedAt = new Date();
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session, 'auto_recovery', 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE');
              return { success: false, booking: null };
            }
          }

          // Validate seats status
          if (event.bookingMode === 'seat_based' && allSeatIds.length > 0) {
            const layoutQuery = SeatLayout.findOne({
              eventId: event._id,
              seats: {
                $elemMatch: {
                  seatId: { $in: allSeatIds },
                  status: { $ne: SeatStatus.AVAILABLE }
                }
              }
            }).session(session);
            const layout = await (layoutQuery && typeof layoutQuery.lean === 'function' ? layoutQuery.lean() : layoutQuery);
            if (layout) {
              _payment.status = PaymentStatus.FAILED;
              _payment.failedAt = new Date();
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session, 'auto_recovery', 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE');
              return { success: false, booking: null };
            }
          }
        }

        // 2. Allocate Seats (SeatLayout update)
        if (event.bookingMode === 'seat_based' && allSeatIds.length > 0) {
          const seatUpdateResult = await SeatLayout.updateOne(
            { eventId: event._id },
            {
              $set: {
                'seats.$[seat].status': SeatStatus.BOOKED,
                'seats.$[seat].bookedByBookingId': booking._id.toString()
              },
              $unset: {
                'seats.$[seat].lockedBy': '',
                'seats.$[seat].lockedAt': '',
              },
              $inc: {
                'seats.$[seat].seatVersion': 1,
              },
            },
            {
              arrayFilters: [
                {
                  'seat.seatId': { $in: allSeatIds },
                  $or: [
                    { 'seat.bookedByBookingId': booking._id.toString() },
                    { 'seat.status': SeatStatus.AVAILABLE }
                  ]
                },
              ],
              session,
            }
          );

          if (seatUpdateResult.modifiedCount !== allSeatIds.length) {
            throw new Error('SEAT_ALLOCATION_FAILED');
          }
        }

        // 3. Allocate Event Capacity
        const incUpdate: Record<string, number> = {
          soldCount: booking.totalTickets,
          eventVersion: 1,
        };

        for (const bookedTicket of booking.tickets) {
          const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
          if (tierIndex !== -1) {
            const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
            incUpdate[`ticketTiers.${tierIndex}.soldCount`] = bookedTicket.quantity * groupSize;
          }
        }

        const eventQuery: any = { _id: event._id };
        
        if (isLateRecovery) {
          eventQuery.$expr = {
            $lte: [
              { $add: ['$soldCount', '$reservedCount', booking.totalTickets] },
              '$totalCapacity'
            ]
          };
          
          for (const bookedTicket of booking.tickets) {
            const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
            if (tierIndex !== -1) {
              const activeTierAgg = await Reservation.aggregate([
                {
                  $match: {
                    eventId: event._id,
                    tier: bookedTicket.tier,
                    status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }
                  }
                },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
              ]).session(session);
              const tierReserved = activeTierAgg[0]?.total ?? 0;
              
              const groupSize = event.ticketTiers[tierIndex].groupSize || 1;
              eventQuery[`ticketTiers.${tierIndex}.soldCount`] = {
                $lte: event.ticketTiers[tierIndex].totalCapacity - tierReserved - bookedTicket.quantity * groupSize
              };
            }
          }
        } else {
          incUpdate.reservedCount = -booking.totalTickets;
        }

        const updatedEvent = await Event.findOneAndUpdate(
          eventQuery,
          { $inc: incUpdate },
          { new: true, session }
        );

        if (!updatedEvent) {
          throw new Error('EVENT_CAPACITY_ALLOCATION_FAILED');
        }

        // Check if user already exists matching the guestEmail
        const user = await UserModel.findOne({
          email: booking.guestEmail?.trim().toLowerCase()
        }).session(session || null);

        const setFields: any = {
          status: BookingStatus.CONFIRMED,
          paymentId: _payment._id,
          confirmedAt: new Date(),
        };
        const unsetFields: any = {
          expiresAt: 1,
          logicalExpiresAt: 1,
        };

        if (user) {
          setFields.userId = user._id;
        }

        // 4. Booking Confirmation Status Transition
        const previousBookingDoc = await Booking.findOneAndUpdate(
          { _id: booking._id, status: { $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] } },
          {
            $set: setFields,
            $unset: unsetFields,
            $inc: { bookingVersion: 1 }
          },
          { new: false, session }
        );
        if (!previousBookingDoc) {
          throw new Error('CONCURRENT_CONFIRMATION_OR_NOT_FOUND');
        }

        await this.redeemCouponForConfirmedBooking(previousBookingDoc, _payment, session);

        // 5. Update Reservation status to CONFIRMED
        await ReservationService.transitionForBooking(previousBookingDoc._id, ReservationStatus.CONFIRMED, {
          paymentReference: _payment.gatewayPaymentId ?? _payment.gatewayOrderId,
          paymentId: _payment._id as any,
          reason: 'payment-confirmed',
          correlationId: previousBookingDoc.bookingId,
          includeTerminal: isLateRecovery,
        }, session);

        const confirmedBooking = previousBookingDoc;
        confirmedBooking.status = BookingStatus.CONFIRMED;
        confirmedBooking.paymentId = _payment._id as any;
        confirmedBooking.bookingVersion += 1;
        booking = confirmedBooking;

        if (updatedEvent && updatedEvent.soldCount >= updatedEvent.totalCapacity && !updatedEvent.isSoldOut) {
          await Event.updateOne({ _id: booking.eventId }, { $set: { isSoldOut: true } }, { session });
        }

        // 6. Generate Tickets & Notification (sync path only)
        let generatedTickets = [];
        let syncNotification = null;
        if (!getEnv().ENABLE_ASYNC_CHECKOUT) {
          // Mid-Flight Booking Protection: Verify and repair totalTickets if needed
          let expectedTotalTickets = 0;
          for (const t of booking.tickets) {
            const tierConfig = event?.ticketTiers?.find((tc) => tc.tier === t.tier);
            expectedTotalTickets += t.quantity * (tierConfig?.groupSize || 1);
          }
          if (booking.totalTickets !== expectedTotalTickets) {
            booking.totalTickets = expectedTotalTickets;
            if (typeof Booking.updateOne === 'function') {
              await Booking.updateOne({ _id: booking._id }, { $set: { totalTickets: expectedTotalTickets } }, { session });
            }
          }

          let ticketIndex = 1;
          for (const bookedTicket of booking.tickets) {
            if (event && event.bookingMode === 'seat_based' && bookedTicket.seats) {
              for (const seat of bookedTicket.seats) {
                const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
                const qrCodeText = ticketId;

                const ticket = await Ticket.findOneAndUpdate(
                  { ticketId },
                  {
                    $setOnInsert: {
                      bookingId: booking._id,
                      eventId: booking.eventId,
                      tierName: bookedTicket.tierName,
                      tier: bookedTicket.tier,
                      admits: 1,
                      seatId: seat.seatId,
                      row: seat.row,
                      seatNumber: seat.number,
                      section: seat.section,
                      qrCode: qrCodeText,
                      qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
                      assignmentStatus: 'unassigned',
                    },
                  },
                  { upsert: true, new: true, setDefaultsOnInsert: true, session }
                );
                generatedTickets.push(ticket);
                ticketIndex++;
              }
            } else {
              const tierConfig = event?.ticketTiers?.find(t => t.tier === bookedTicket.tier);
              const groupSize = tierConfig?.groupSize || 1;
              const totalAdmissions = bookedTicket.quantity * groupSize;

              for (let i = 0; i < totalAdmissions; i++) {
                const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
                const qrCodeText = ticketId;

                const ticket = await Ticket.findOneAndUpdate(
                  { ticketId },
                  {
                    $setOnInsert: {
                      bookingId: booking._id,
                      eventId: booking.eventId,
                      tierName: bookedTicket.tierName,
                      tier: bookedTicket.tier,
                      admits: 1,
                      qrCode: qrCodeText,
                      qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
                      assignmentStatus: 'unassigned',
                    },
                  },
                  { upsert: true, new: true, setDefaultsOnInsert: true, session }
                );
                generatedTickets.push(ticket);
                ticketIndex++;
              }
            }
          }

          const jobId = `email:dispatch:${booking._id}`;
          syncNotification = await createNotificationSafe({
            jobId,
            status: 'processing',
            queuedAt: new Date(),
            processedAt: new Date(),
            type: NotificationType.BOOKING_CONFIRMED,
            bookingId: booking._id,
            eventId: booking.eventId,
            channel: 'email',
            recipient: booking.guestEmail,
            subject: `Your Ticket for ${event?.title || 'MAD Event'} [${booking.bookingId}]`,
            isSent: false,
            retryCount: 0,
          }, { session });
        }

        return {
          success: true,
          booking,
          updatedEvent,
          generatedTickets,
          syncNotification,
        };
      });
    } catch (err: any) {
      logger.error({ err, bookingId: booking._id }, 'Confirmation transaction aborted and rolled back');
      
      if (err.message === 'PAYMENT_ALREADY_CLAIMED_OR_NOT_PENDING') {
        logger.info(
          { bookingId: booking._id, paymentId: _payment._id },
          'Payment already claimed by concurrent caller — skipping'
        );
        const resolvedBooking = await Booking.findById(booking._id);
        return resolvedBooking || booking;
      }

      let reason = 'CONFIRMATION_TRANSACTION_FAILED';
      const isKnownAbort = ['SEAT_ALLOCATION_FAILED', 'EVENT_CAPACITY_ALLOCATION_FAILED', 'CONCURRENT_CONFIRMATION_OR_NOT_FOUND', 'EVENT_EXPIRED_DURING_CONFIRMATION'].includes(err.message);

      if (err.message === 'SEAT_ALLOCATION_FAILED' || err.message === 'EVENT_CAPACITY_ALLOCATION_FAILED') {
        reason = 'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN';
      } else if (err.message === 'EVENT_EXPIRED_DURING_CONFIRMATION') {
        reason = 'EVENT_EXPIRED_DURING_CONFIRMATION';
      } else if (err.message === 'CONCURRENT_CONFIRMATION_OR_NOT_FOUND') {
        reason = 'LATE_PAYMENT_RECOVERY_REJECTED_CONCURRENT_CONFIRM';
        const currentBooking = await Booking.findById(booking._id).select('status paymentId').lean().catch(() => null);
        if (currentBooking?.status === BookingStatus.CONFIRMED) {
          const isSamePayment = currentBooking.paymentId && currentBooking.paymentId.toString() === _payment._id.toString();
          
          if (isSamePayment) {
            logger.info(
              { bookingId: booking._id, paymentId: _payment._id },
              'Concurrent confirmation (Same Payment): Booking is already CONFIRMED by concurrent thread of this payment. Exiting safely.'
            );
            const resolvedBooking = await Booking.findById(booking._id);
            return resolvedBooking || booking;
          } else {
            logger.warn(
              { bookingId: booking._id, incomingPaymentId: _payment._id, winningPaymentId: currentBooking.paymentId },
              'Concurrent confirmation (Different Payment): Booking is already CONFIRMED. Refunding duplicate incoming payment.'
            );
            _payment.status = PaymentStatus.FAILED;
            _payment.failureReason = 'DUPLICATE_PAYMENT_ON_CONFIRMED_BOOKING';
            _payment.failedAt = new Date();
            try {
              await _payment.save();
            } catch (saveErr) {
              // ignore
            }
            await this.triggerRefundRequest(booking, _payment, _payment.failureReason).catch(() => {});
            const resolvedBooking = await Booking.findById(booking._id);
            return resolvedBooking || booking;
          }
        }
      }
      
      _payment.status = PaymentStatus.FAILED;
      _payment.failureReason = reason;
      try {
        await _payment.save();
      } catch (saveErr) {
        // ignore
      }
      await this.triggerRefundRequest(
        booking,
        _payment,
        _payment.failureReason,
        undefined,
        isLateRecovery || err.message === 'EVENT_EXPIRED_DURING_CONFIRMATION' ? 'auto_recovery' : 'manual',
        isLateRecovery || err.message === 'EVENT_EXPIRED_DURING_CONFIRMATION' ? 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE' : undefined
      ).catch(() => {});

      if (isKnownAbort) {
        return null;
      }
      throw err;
    }

    if (!transactionResult || !transactionResult.success) {
      return null;
    }

    const { syncNotification } = transactionResult;
    booking = transactionResult.booking;

    // 5. Post-Commit Cache Invalidation
    await CacheService.delPattern('events:*').catch((err) => {
      logger.error({ err }, 'Failed to clear events cache post-commit');
    });

    // 6. Post-Commit Sockets
    if (event.bookingMode === 'seat_based') {
      this.safeEmit(
        'seat:booked',
        () => emitToEvent(event._id.toString(), 'seat:booked', {
          eventId: event._id.toString(),
          bookingId: booking._id.toString(),
          seatIds: allSeatIds,
        }, booking.bookingId),
        { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: allSeatIds }
      );
    }

    this.safeEmit(
      'booking:updated',
      () => emitToBooking(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin booking:updated',
      () => emitToAdmin('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }, booking.bookingId),
      { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }
    );
    this.safeEmit(
      'admin analytics:changed',
      () => emitToAdmin('analytics', 'analytics:changed', { bookingId: booking._id.toString(), eventId: booking.eventId.toString() }, booking.bookingId),
      { bookingId: booking._id.toString(), eventId: booking.eventId.toString() }
    );

    // 7. Post-Commit Queue Enqueue (async path)
    if (getEnv().ENABLE_ASYNC_CHECKOUT) {
      await QueueService.enqueue(
        getQueueName('booking-queue'),
        'booking:confirm',
        { bookingId: booking._id.toString() },
        `booking:confirm:${booking._id}`
      );
      logger.info({ bookingId: booking._id }, 'Asynchronous checkout enabled. Handed off confirmation tasks to background queue.');
      return booking;
    }

    // 8. Post-Commit Sync Email Dispatch (sync path only)
    if (syncNotification && booking.guestEmail) {
      try {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>Hi ${booking.guestName},</h2>
            <p>Your booking <strong>${booking.bookingId}</strong> for the event <strong>"${event?.title || 'MAD Event'}"</strong> has been successfully confirmed!</p>
            <p>Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.</p>
            <br/>
            <p>MAD Entertainment Team</p>
          </div>
        `;

        const pdfBuffer = await generateTicketPDF(booking, event);

        await sendEmail({
          to: booking.guestEmail,
          subject: `Your Ticket for ${event?.title || 'MAD Event'} [${booking.bookingId}]`,
          html: emailBody,
          attachments: [
            {
              filename: `MAD_Ticket_${booking.bookingId}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        await Notification.updateOne(
          { _id: syncNotification._id },
          { $set: { status: 'sent', isSent: true, processedAt: new Date() } }
        ).catch((err) => {
          logger.error({ err, notificationId: syncNotification._id }, 'Failed to update notification status to sent');
        });
      } catch (emailErr: any) {
        await Notification.updateOne(
          { _id: syncNotification._id },
          { $set: { status: 'failed', errorMessage: emailErr.message, processedAt: new Date() } }
        ).catch((err) => {
          logger.error({ err, notificationId: syncNotification._id }, 'Failed to update notification status to failed');
        });
        logger.error({ err: emailErr }, 'Failed to send synchronous confirmation email');
      }
    }

    return booking;
  }

  private static async createPendingPayment(
    bookingId: Types.ObjectId,
    gateway: 'stripe' | 'razorpay',
    amount: number,
    currency: string,
    couponId: Types.ObjectId | undefined,
    gatewayOrderId: string
  ): Promise<IPayment> {
    try {
      return await Payment.create({
        bookingId,
        gateway,
        status: PaymentStatus.PENDING,
        amount,
        currency,
        couponId,
        gatewayOrderId,
      });
    } catch (err: any) {
      const isDuplicateKey = err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');
      if (isDuplicateKey) {
        logger.warn(
          { bookingId, gateway, gatewayOrderId },
          'Concurrent pending payment creation race detected. Recovering existing pending payment.'
        );
        const existing = await Payment.findOne({
          bookingId,
          gateway,
          status: PaymentStatus.PENDING,
        });
        if (existing) {
          return existing;
        }
      }
      throw err;
    }
  }

  static async reconcileStripeRefundWebhook(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    let gatewayPaymentId: string;
    let gatewayRefundId: string | undefined;
    let gatewayStatus = 'succeeded';
    let amountInCents = 0;

    if (eventType === 'charge.refunded') {
      const charge = chargeOrRefund as StripeChargeWebhookPayload;
      gatewayPaymentId = charge.id;
      gatewayRefundId = charge.refunds?.data?.[0]?.id;
      amountInCents = charge.refunds?.data?.[0]?.amount || 0;
    } else {
      const refund = chargeOrRefund as StripeRefundWebhookPayload;
      gatewayPaymentId = refund.charge;
      gatewayRefundId = refund.id;
      gatewayStatus = refund.status;
      amountInCents = refund.amount || 0;
    }

    if (!gatewayRefundId) {
      logger.warn({ chargeId: gatewayPaymentId, webhookEventId, eventType }, 'Stripe webhook received but missing gatewayRefundId');
      return { status: 'skipped' };
    }

    // Stripe status mappings: only complete if succeeded
    if (eventType === 'refund.updated' && gatewayStatus !== 'succeeded' && gatewayStatus !== 'failed') {
      logger.info({ gatewayRefundId, gatewayStatus, webhookEventId }, 'Stripe refund updated with non-terminal status - skipping');
      return { status: 'skipped' };
    }

    this.assertProductionPaymentIntegrity(
      [gatewayPaymentId, gatewayRefundId],
      {
        paymentId: gatewayPaymentId,
        gateway: 'stripe',
        requestSource: 'webhook',
      }
    );

    return this.reconcileRefundWebhook({
      gateway: 'stripe',
      gatewayPaymentId,
      gatewayRefundId,
      amountMajorUnits: amountInCents / 100,
      gatewayStatus,
      webhookEventId
    });
  }

  static async reconcileRazorpayRefundWebhook(
    refundEntity: RazorpayRefundWebhookPayload,
    eventType: string,
    webhookEventId: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    const gatewayPaymentId = refundEntity.payment_id;
    const gatewayRefundId = refundEntity.id;
    const amountInPaise = refundEntity.amount;
    const gatewayStatus = eventType === 'refund.processed' ? 'processed' : 'failed';

    if (!gatewayRefundId) {
      logger.warn({ paymentId: gatewayPaymentId, webhookEventId, eventType }, 'Razorpay webhook received but missing gatewayRefundId');
      return { status: 'skipped' };
    }

    this.assertProductionPaymentIntegrity(
      [gatewayPaymentId, gatewayRefundId],
      {
        paymentId: gatewayPaymentId,
        gateway: 'razorpay',
        requestSource: 'webhook',
      }
    );

    return this.reconcileRefundWebhook({
      gateway: 'razorpay',
      gatewayPaymentId,
      gatewayRefundId,
      amountMajorUnits: amountInPaise / 100,
      gatewayStatus,
      webhookEventId
    });
  }

  private static async reconcileRefundWebhook(params: {
    gateway: 'stripe' | 'razorpay';
    gatewayPaymentId: string;
    gatewayRefundId: string;
    amountMajorUnits: number;
    gatewayStatus: string;
    webhookEventId: string;
  }): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    const { gateway, gatewayPaymentId, gatewayRefundId, amountMajorUnits, gatewayStatus, webhookEventId } = params;
    const isSucceeded = gatewayStatus === 'succeeded' || gatewayStatus === 'processed';
    const isFailed = gatewayStatus === 'failed';

    // Primary Lookup
    let refund = await Refund.findOne({ gatewayRefundId });

    // Fallback Lookup (RFND-H02)
    if (!refund && gatewayPaymentId) {
      const paymentObj = await Payment.findOne({ gatewayPaymentId, gateway });
      if (paymentObj) {
        refund = await Refund.findOne({
          paymentId: paymentObj._id,
          status: { $in: [RefundStatus.PROCESSING, RefundStatus.REQUESTED] },
          amount: amountMajorUnits
        });
      }
    }

    // Gateway-Initiated Auto-Creation (RFND-B-F02)
    if (!refund) {
      const paymentObj = await Payment.findOne({ gatewayPaymentId, gateway });
      if (paymentObj) {
        const isFullRefund = amountMajorUnits === paymentObj.amount;
        
        try {
          const result = await runInTransaction(async (session) => {
            // Serialization lock on Payment
            await Payment.findOneAndUpdate(
              { _id: paymentObj._id },
              { $set: { updatedAt: new Date() } },
              { session, new: true }
            );

            // Double check duplicate gatewayRefundId to prevent race
            const doubleCheck = await Refund.findOne({ gatewayRefundId }).session(session);
            if (doubleCheck) {
              return { status: 'completed' as const, refundId: doubleCheck._id.toString(), paymentId: paymentObj._id.toString() };
            }

            const createdRefund = await Refund.create([{
              bookingId: paymentObj.bookingId,
              paymentId: paymentObj._id,
              amount: amountMajorUnits,
              currency: paymentObj.currency,
              reason: 'Reconciled from gateway-initiated refund webhook',
              status: RefundStatus.COMPLETED,
              origin: 'manual',
              gatewayRefundId,
              gatewayRefundStatus: gatewayStatus,
              reconciledAt: new Date(),
              processedAt: new Date(),
              webhookEventId,
              cancelTickets: isFullRefund
            }], { session });

            const newRefundDoc = createdRefund[0];

            // Calculate new Payment Status
            const otherCompletedRefunds = await Refund.find({
              paymentId: paymentObj._id,
              status: RefundStatus.COMPLETED,
              _id: { $ne: newRefundDoc._id }
            }).session(session);
            const totalCompletedRefunded = otherCompletedRefunds.reduce((sum, r) => sum + r.amount, 0);
            const isReallyFullRefund = (totalCompletedRefunded + newRefundDoc.amount) === paymentObj.amount;
            const newPaymentStatus = isReallyFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

            await Payment.findByIdAndUpdate(paymentObj._id, { status: newPaymentStatus }, { session });

            let cancelPostCommitPayload = null;
            const booking = await Booking.findById(paymentObj.bookingId).session(session);
            if (booking) {
              if (isReallyFullRefund) {
                if (booking.status === BookingStatus.CONFIRMED) {
                  const cancelResult = await cancelBooking(
                    booking._id.toString(),
                    `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Full Auto-Refund`,
                    session,
                    BookingStatus.REFUNDED
                  );
                  if (cancelResult && cancelResult.postCommitPayload) {
                    cancelPostCommitPayload = cancelResult.postCommitPayload;
                  }
                } else if (booking.status === BookingStatus.CANCELLED) {
                  booking.status = BookingStatus.REFUNDED;
                  booking.bookingVersion += 1;
                  await booking.save({ session });
                }
              } else {
                // Partial refund
                logger.info({ paymentId: paymentObj._id, bookingId: booking._id }, 'Partial gateway-initiated refund - flagging for manual review, booking active');
              }
            }

            return {
              status: 'completed' as const,
              refundId: newRefundDoc._id.toString(),
              paymentId: paymentObj._id.toString(),
              cancelPostCommitPayload,
              isNewRefund: true
            };
          });

          // Run post-commit cancellation effects outside session
          if (result.cancelPostCommitPayload) {
            try {
              await executeCancelBookingSideEffects(result.cancelPostCommitPayload);
            } catch (err) {
              logger.error({ err }, `Error executing booking cancel side effects post-commit in reconcileRefundWebhook (${gateway})`);
            }
          }

          // Trigger email notification for the auto-created refund
          if (result.isNewRefund) {
            try {
              await this.triggerRefundEmailNotification(result.refundId);
            } catch (err) {
              logger.error({ err, refundId: result.refundId }, 'Failed to trigger auto-created refund notification email');
            }
          }

          return { status: result.status, refundId: result.refundId, paymentId: result.paymentId };
        } catch (err: any) {
          logger.error({ err, gatewayRefundId }, `Failed to process auto-created ${gateway} refund webhook`);
          throw err;
        }
      }
      logger.warn({ gatewayPaymentId, gatewayRefundId }, `${gateway} webhook received but no matching Payment or Refund record found`);
      return { status: 'skipped' };
    }

    // Check terminal states (Idempotency)
    if (refund.status === RefundStatus.COMPLETED) {
      if (isFailed) {
        // Anomaly Alert (RFND-M02)
        const gatewayLabel = gateway === 'stripe' ? 'Stripe' : 'Razorpay';
        const errMsg = `CRITICAL ANOMALY: Webhook reports ${gatewayLabel} refund ${gatewayRefundId} failed, but DB status is completed!`;
        logger.error({ refundId: refund._id, gatewayRefundId }, errMsg);
        
        // Structured Audit Log for state anomaly
        auditLog({
          action: 'REFUND_RECONCILIATION_ANOMALY',
          actor: { type: 'admin', id: 'system' },
          status: 'failure',
          description: errMsg,
          metadata: {
            refundId: refund._id.toString(),
            gatewayRefundId,
            gatewayStatus,
            dbStatus: refund.status,
          }
        });

        Sentry.captureMessage(errMsg, { level: 'error' as const });
        return { status: 'anomaly', refundId: refund._id.toString(), paymentId: refund.paymentId.toString() };
      }
      return { status: 'completed', refundId: refund._id.toString(), paymentId: refund.paymentId.toString() };
    }

    if (refund.status === RefundStatus.FAILED) {
      if (isSucceeded) {
        // Anomaly Alert (RFND-M02)
        const gatewayLabel = gateway === 'stripe' ? 'Stripe' : 'Razorpay';
        const errMsg = `CRITICAL ANOMALY: Webhook reports ${gatewayLabel} refund ${gatewayRefundId} succeeded, but DB status is failed!`;
        logger.error({ refundId: refund._id, gatewayRefundId }, errMsg);

        // Structured Audit Log for state anomaly
        auditLog({
          action: 'REFUND_RECONCILIATION_ANOMALY',
          actor: { type: 'admin', id: 'system' },
          status: 'failure',
          description: errMsg,
          metadata: {
            refundId: refund._id.toString(),
            gatewayRefundId,
            gatewayStatus,
            dbStatus: refund.status,
          }
        });

        Sentry.captureMessage(errMsg, { level: 'error' as const });
        return { status: 'anomaly', refundId: refund._id.toString(), paymentId: refund.paymentId.toString() };
      }
      return { status: 'failed', refundId: refund._id.toString(), paymentId: refund.paymentId.toString() };
    }

    // Execute Reconciliation Transaction
    try {
      const result = await runInTransaction(async (session) => {
        // Serialization lock on Payment
        const payment = await Payment.findOneAndUpdate(
          { _id: refund.paymentId },
          { $set: { updatedAt: new Date() } },
          { session, new: true }
        );

        if (!payment) throw new Error('Payment not found');

        const booking = await Booking.findById(refund.bookingId).session(session);
        if (!booking) throw new Error('Booking not found');

        // Atomic Status Transition (RFND-M01)
        const updatedRefund = await Refund.findOneAndUpdate(
          { _id: refund._id, status: { $in: [RefundStatus.PROCESSING, RefundStatus.REQUESTED] } },
          {
            $set: {
              status: isFailed ? RefundStatus.FAILED : RefundStatus.COMPLETED,
              gatewayRefundStatus: gatewayStatus,
              reconciledAt: new Date(),
              processedAt: new Date(),
              webhookEventId
            }
          },
          { session, new: true }
        );

        if (!updatedRefund) {
          // Concurrent win
          const currentRefund = await Refund.findById(refund._id).session(session);
          if (currentRefund?.status === RefundStatus.COMPLETED) {
            return { status: 'completed' as const, refundId: refund._id.toString(), paymentId: payment._id.toString() };
          }
          return { status: 'failed' as const, refundId: refund._id.toString(), paymentId: payment._id.toString() };
        }

        if (updatedRefund.status === RefundStatus.COMPLETED) {
          // Calculate new Payment Status
          const otherCompletedRefunds = await Refund.find({
            paymentId: payment._id,
            status: RefundStatus.COMPLETED,
            _id: { $ne: updatedRefund._id }
          }).session(session);
          const totalCompletedRefunded = otherCompletedRefunds.reduce((sum, r) => sum + r.amount, 0);
          const isFullRefund = (totalCompletedRefunded + updatedRefund.amount) === payment.amount;
          const newPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

          await Payment.findByIdAndUpdate(payment._id, { status: newPaymentStatus }, { session });

          let cancelPostCommitPayload = null;
          if (isFullRefund) {
            if (booking.status === BookingStatus.CONFIRMED) {
              const cancelResult = await cancelBooking(booking._id.toString(), `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Reconciled`, session, BookingStatus.REFUNDED);
              if (cancelResult && cancelResult.postCommitPayload) {
                cancelPostCommitPayload = cancelResult.postCommitPayload;
              }
            } else if (booking.status === BookingStatus.CANCELLED) {
              booking.status = BookingStatus.REFUNDED;
              booking.bookingVersion += 1;
              await booking.save({ session });
            }
          } else if (updatedRefund.cancelTickets && booking.status === BookingStatus.CONFIRMED) {
            const cancelResult = await cancelBooking(booking._id.toString(), `${gateway === 'stripe' ? 'Stripe' : 'Razorpay'} Webhook Reconciled`, session, BookingStatus.CANCELLED);
            if (cancelResult && cancelResult.postCommitPayload) {
              cancelPostCommitPayload = cancelResult.postCommitPayload;
            }
          }

          return {
            status: 'completed' as const,
            refundId: updatedRefund._id.toString(),
            paymentId: payment._id.toString(),
            cancelPostCommitPayload,
            transitioned: true
          };
        } else {
          // Failed refund
          return {
            status: 'failed' as const,
            refundId: updatedRefund._id.toString(),
            paymentId: payment._id.toString()
          };
        }
      });

      // Run post-commit cancellation effects outside session
      if (result.cancelPostCommitPayload) {
        try {
          await executeCancelBookingSideEffects(result.cancelPostCommitPayload);
        } catch (err) {
          logger.error({ err }, `Error executing booking cancel side effects post-commit in reconcileRefundWebhook (${gateway})`);
        }
      }

      // Trigger email notification if webhook was the thread that completed the transition
      if (result.status === 'completed' && result.transitioned) {
        try {
          await this.triggerRefundEmailNotification(result.refundId);
        } catch (err) {
          logger.error({ err, refundId: result.refundId }, 'Failed to trigger reconciled refund notification email');
        }
      }

      return { status: result.status, refundId: result.refundId, paymentId: result.paymentId };
    } catch (err: any) {
      logger.error({ err, refundId: refund._id }, `Error during ${gateway} refund webhook reconciliation`);
      throw err;
    }
  }

  private static async triggerRefundEmailNotification(refundId: string): Promise<void> {
    try {
      const refund = await Refund.findById(refundId);
      if (!refund || refund.status !== RefundStatus.COMPLETED) {
        return;
      }

      const booking = await Booking.findById(refund.bookingId).populate('eventId');
      if (!booking || !booking.guestEmail) {
        return;
      }

      const event = booking.eventId as any;
      const refundAmount = refund.amount;
      const totalAmount = booking.totalAmount;

      let emailHtml = '';
      let subject = '';
      let notificationType: NotificationType | undefined;

      const completedRefunds = await Refund.find({
        paymentId: refund.paymentId,
        status: RefundStatus.COMPLETED
      });
      const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);
      const payment = await Payment.findById(refund.paymentId);
      const isFullRefund = payment ? totalRefunded === payment.amount : false;

      if (isFullRefund) {
        const existingNotification = await Notification.findOne({
          jobId: { $regex: `^refund-${refund._id}` }
        });

        if (!existingNotification) {
          const formattedRefundDate = new Date(refund.processedAt || new Date()).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          emailHtml = await fullRefundHtml({
            customerName: booking.guestName,
            bookingReference: booking.bookingId,
            eventTitle: event?.title || 'MAD Event',
            refundAmount: refundAmount,
            refundDate: formattedRefundDate,
            settlementTimeline: '5-7 business days',
            currency: booking.currency || 'INR',
          });

          subject = `Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.FULL_REFUND;
        }
      } else {
        const existingNotification = await Notification.findOne({
          jobId: { $regex: `^refund-${refund._id}` }
        });

        if (!existingNotification) {
          emailHtml = await partialRefundHtml({
            customerName: booking.guestName,
            bookingReference: booking.bookingId,
            originalAmount: totalAmount,
            refundAmount: refundAmount,
            remainingAmount: Math.max(0, totalAmount - totalRefunded),
            reason: refund.reason || 'Tier adjustment refund',
            currency: booking.currency || 'INR',
          });

          subject = `Partial Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.PARTIAL_REFUND;
        }
      }

      if (emailHtml && notificationType) {
        const jobId = `refund-${refund._id}-${Date.now()}`;
        // CQ-02 notification array consistency fix
        await createNotificationSafe({
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: notificationType,
          channel: 'email',
          recipient: booking.guestEmail,
          subject,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: event?._id
        });

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject,
            html: emailHtml,
            notificationType,
            bookingId: booking._id.toString(),
            eventId: event?._id?.toString() || booking.eventId?.toString() || '',
          },
          jobId
        );

        logger.info({
          emailType: isFullRefund ? 'FULL_REFUND' : 'PARTIAL_REFUND',
          recipient: booking.guestEmail,
          bookingId: booking._id.toString(),
          refundId: refund._id.toString(),
          jobId,
        }, 'Successfully enqueued refund notification email job via webhook reconciliation');
      }
    } catch (err) {
      logger.error({ err, refundId }, 'Error triggering email notification in webhook reconciliation');
    }
  }
}
