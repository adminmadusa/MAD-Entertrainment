import crypto from 'crypto';
import { Types, ClientSession } from 'mongoose';
import * as Sentry from '@sentry/node';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType, RefundStatus } from '@mad/shared';

import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { StripeAdapter } from './stripe.adapter';
import { RazorpayAdapter } from './razorpay.adapter';
import { PaymentValidationService } from './payment-validation.service';
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
import { PaymentRefundService } from './payment-refund.service';
import { PaymentInventoryService } from './payment-inventory.service';
import { PaymentBookingService } from './payment-booking.service';

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
    PaymentValidationService.assertProductionPaymentIntegrity(identifiers, getEnv(), context);
  }

  private static assertProductionMockRuntimeBlocked(
    context: {
      bookingId?: string;
      paymentId?: string;
      gateway?: string;
      requestSource?: string;
    } = {}
  ): void {
    PaymentValidationService.assertProductionMockRuntimeBlocked(getEnv(), context);
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
            const intent = await StripeAdapter.retrievePaymentIntent(existingPayment.gatewayOrderId!);
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

    if (!RazorpayAdapter.isEnabled()) {
      throw AppError.badRequest('Razorpay is not enabled / credentials missing');
    }

    const amountPaise = Math.round(booking.totalAmount * 100);
    if (amountPaise < 100) {
      throw AppError.badRequest('Amount must be at least 1 INR (100 paise) for Razorpay transactions');
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
      const mockIntentId = 'pi_mock_' + crypto.randomBytes(4).toString('hex');
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
        clientSecret: mockIntentId + '_secret_' + crypto.randomBytes(4).toString('hex'),
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
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
        currency: booking.currency || 'INR',
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingId,
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

    const env = getEnv();

    // 1. Validate the cryptographic gateway proof first (Stripe retrieve / Razorpay signature checks).
    //    Proving possession of these credentials serves as authoritative confirmation of purchase ownership,
    //    allowing ownership recovery/sync and bypassing traditional session/user matching checks.
    await this.validateGatewayProof(booking, payment, gatewayPayload, env);

    // 2. Perform Ownership Recovery/Sync:
    let bookingModified = false;

    // Check if the booking is already owned by an authenticated user
    if (booking.userId) {
      if (ownershipContext.userId) {
        if (booking.userId.toString() !== ownershipContext.userId) {
          logger.warn(
            { bookingId: booking._id, existingOwner: booking.userId, attemptedOwner: ownershipContext.userId },
            'Ownership recovery blocked: cannot overwrite existing authenticated user ownership'
          );
          throw AppError.forbidden('You do not have access to this booking');
        }
      }
      // If booking.userId is set and client is guest (ownershipContext.userId is undefined),
      // we do not mutate booking.sessionId or booking.userId.
    } else {
      // booking.userId is null/undefined
      if (ownershipContext.userId) {
        logger.info(
          { bookingId: booking._id, newUser: ownershipContext.userId },
          'Ownership recovery: linking booking to authenticated user'
        );
        booking.userId = new Types.ObjectId(ownershipContext.userId);
        bookingModified = true;
      }

      if (ownershipContext.sessionId && booking.sessionId !== ownershipContext.sessionId) {
        logger.info(
          { bookingId: booking._id, oldSession: booking.sessionId, newSession: ownershipContext.sessionId },
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

    let confirmedBooking: IBooking | null = null;

    if (payment.gateway === 'razorpay') {
      const { razorpay_payment_id, razorpay_signature } = gatewayPayload;
      const isMock = env.MOCK_PAYMENTS && razorpay_payment_id.startsWith('pay_mock_') && razorpay_signature === 'mock_signature';

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
          : `Verified Stripe payment intent ${paymentIntentId} for booking ${booking.bookingId}`
      });

      confirmedBooking = await this.confirmBooking(booking, payment);
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
      const { razorpay_payment_id, razorpay_signature } = gatewayPayload || {};
      const isMock = env.MOCK_PAYMENTS && razorpay_payment_id?.startsWith('pay_mock_') && razorpay_signature === 'mock_signature';

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

  private static safeEmit(label: string, emit: () => void, data: Record<string, unknown>) {
    try {
      emit();
    } catch (err) {
      logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
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
    return PaymentRefundService.triggerRefundRequest(
      booking,
      payment,
      reason,
      session,
      origin,
      recoveryReason
    );
  }

  private static async failPaymentAndReleaseInventory(
    booking: IBooking,
    payment: IPayment,
    reason: string,
    origin?: 'manual' | 'auto_recovery',
    recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE' | 'EXPIRED_BOOKING_CAPACITY_UNAVAILABLE'
  ) {
    return PaymentRefundService.failPaymentAndReleaseInventory(
      booking,
      payment,
      reason,
      origin,
      recoveryReason
    );
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
        if (!session) {
          throw new Error('NO_DATABASE_SESSION_AVAILABLE');
        }
        return PaymentBookingService.confirmBooking(booking, _payment, session, event, allSeatIds, isLateRecovery, {
          triggerRefundRequest: this.triggerRefundRequest.bind(this)
        });
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
    return PaymentRefundService.reconcileStripeRefundWebhook(
      chargeOrRefund,
      webhookEventId,
      eventType
    );
  }

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
