import crypto from 'crypto';
import { Types, ClientSession } from 'mongoose';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

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
import { paymentFailureHtml } from '../../lib/email';
import { ReservationService } from '../reservation.service';
import { QueueService } from '../queue.service';
import { CacheService } from '../cache.service';
import { createNotificationSafe } from '../notification.service';
import { runInTransaction } from '../../utils/transaction';

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

    const isUserOwner =
      !!booking.userId &&
      !!ownershipContext.userId &&
      booking.userId.toString() === ownershipContext.userId;
    const isGuestOwner =
      !!booking.sessionId &&
      !!ownershipContext.sessionId &&
      booking.sessionId === ownershipContext.sessionId;

    if (!isUserOwner && !isGuestOwner) {
      throw AppError.forbidden('You do not have access to this booking');
    }
  }

  static async createPaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay', ownershipContext: PaymentOwnershipContext = {}) {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    this.assertBookingOwnership(booking, ownershipContext);

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
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

    if (gateway === 'razorpay') {
      return this.handleRazorpayIntent(booking, env);
    }

    return this.handleStripeIntent(booking, env);
  }

  private static async handleRazorpayIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
    if (env.MOCK_PAYMENTS) {
      const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 10);
      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'razorpay',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: 'INR',
        gatewayOrderId: mockOrderId,
      });

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

      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'razorpay',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: 'INR',
        gatewayOrderId: order.id,
      });

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
      const mockIntentId = 'pi_mock_' + Math.random().toString(36).substring(2, 10);
      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        gatewayOrderId: mockIntentId,
      });

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

    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.totalAmount * 100),
        currency: booking.currency?.toLowerCase() || 'inr',
        // PR-02: Standardised metadata keys.
        // bookingId  — MongoId, used for exact binding check during verification.
        // bookingReference — human-readable MAD-YYYY-XXXXX, secondary binding check.
        // environment — disambiguates test vs production events in Stripe dashboard.
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          environment: getEnv().NODE_ENV,
        },
      });

      const payment = await Payment.create({
        bookingId: booking._id,
        gateway: 'stripe',
        status: PaymentStatus.PENDING,
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        gatewayOrderId: paymentIntent.id,
      });

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

    // 4. Route by event type.
    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      // Amount & currency verification (defense-in-depth)
      if (amountPaise !== undefined) {
        const expectedAmountPaise = Math.round(booking.totalAmount * 100);
        if (amountPaise !== expectedAmountPaise) {
          logger.error(
            {
              bookingId: booking._id,
              bookingReference: booking.bookingId,
              razorpayOrderId,
              razorpayPaymentId,
              expectedAmountPaise,
              receivedAmountPaise: amountPaise,
            },
            'SECURITY: Razorpay payment amount mismatch in webhook'
          );
          await this.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Amount mismatch in webhook: expected ${expectedAmountPaise} paise, received ${amountPaise}`
          );
          auditLog({
            action: 'PAYMENT_SECURITY_VIOLATION',
            status: 'failure',
            metadata: {
              bookingId: booking._id.toString(),
              bookingReference: booking.bookingId,
              gateway: 'razorpay',
              expectedAmountPaise,
              receivedAmountPaise: amountPaise,
              violationType: 'amount_mismatch',
            },
            description: `SECURITY VIOLATION: Razorpay payment amount mismatch in webhook for booking ${booking.bookingId}`
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }
      }

      if (currency !== undefined) {
        const expectedCurrency = (booking.currency || 'INR').toLowerCase();
        const receivedCurrency = currency.toLowerCase();
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
            'SECURITY: Razorpay payment currency mismatch in webhook'
          );
          await this.failPaymentAndReleaseInventory(
            booking,
            payment,
            `Currency mismatch in webhook: expected ${expectedCurrency}, received ${receivedCurrency}`
          );
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
            description: `SECURITY VIOLATION: Razorpay payment currency mismatch in webhook for booking ${booking.bookingId}`
          });
          return { status: 'skipped', bookingId: booking._id.toString() };
        }
      }

      // Mark payment as PAID — no payment signature re-check here because:
      // (a) the webhook body is already authenticated via HMAC at the controller.
      // (b) RAZORPAY_KEY_SECRET signatures are only available in the checkout redirect,
      //     not in the webhook payload.
      payment.status = PaymentStatus.PAID;
      payment.gatewayPaymentId = razorpayPaymentId;
      payment.paidAt = new Date();
      await payment.save();

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

    this.assertBookingOwnership(booking, ownershipContext);

    const { paymentIntentId, razorpay_order_id, razorpay_payment_id } = gatewayPayload || {};

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

    if (payment.status === PaymentStatus.PAID) {
      return booking; // Already verified & confirmed
    }

    const env = getEnv();
    let confirmedBooking: IBooking | null = null;

    if (payment.gateway === 'razorpay') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw AppError.badRequest('Missing Razorpay credentials in payment payload');
      }

      const isMock = env.MOCK_PAYMENTS && razorpay_payment_id.startsWith('pay_mock_') && razorpay_signature === 'mock_signature';

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

      payment.status = PaymentStatus.PAID;
      payment.gatewayPaymentId = razorpay_payment_id;
      payment.gatewaySignature = razorpay_signature;
      payment.paidAt = new Date();
      await payment.save();

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
        payment.status = PaymentStatus.PAID;
        payment.gatewayPaymentId = paymentIntentId;
        payment.paidAt = new Date();
        await payment.save();

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
          await this.failPaymentAndReleaseInventory(booking, payment, `Amount mismatch: expected ${expectedAmountPaise} paise, received ${receivedAmountPaise}`);
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
          await this.failPaymentAndReleaseInventory(booking, payment, `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`);
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

        payment.status = PaymentStatus.PAID;
        payment.gatewayPaymentId = intent.id;
        payment.paidAt = new Date();
        await payment.save();

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
      this.assertBookingOwnership(confirmedBooking, ownershipContext);
      return confirmedBooking;
    }

    const latestBooking = await Booking.findById(booking._id);
    if (latestBooking) {
      this.assertBookingOwnership(latestBooking, ownershipContext);
    }
    return latestBooking || booking;
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

  private static async triggerRefundRequest(booking: IBooking, payment: IPayment, reason: string, session?: ClientSession): Promise<void> {
    const existingRefund = await Refund.findOne({ paymentId: payment._id }).session(session || null);
    if (!existingRefund) {
      await Refund.create([{
        bookingId: booking._id,
        paymentId: payment._id,
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        reason: reason || 'LATE_PAYMENT_RECOVERY_REJECTED',
        status: 'requested',
      }], { session });
      logger.info(
        { bookingId: booking._id, paymentId: payment._id, amount: booking.totalAmount, reason },
        'Created automatic Refund request record due to late payment recovery rejection'
      );
    }
  }

  private static async failPaymentAndReleaseInventory(booking: IBooking, payment: IPayment, reason: string) {
    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

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
        // 1. Pre-validation for Late Recovery
        if (isLateRecovery) {
          // Validate general capacity
          if (event.soldCount + event.reservedCount + booking.totalTickets > event.totalCapacity) {
            _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED';
            await _payment.save({ session });
            await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session);
            return { success: false, booking: null };
          }

          // Validate tier capacity
          for (const bookedTicket of booking.tickets) {
            const tierConfig = event.ticketTiers.find((t) => t.tier === bookedTicket.tier);
            if (!tierConfig) {
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_INVALID_TIER';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session);
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

            if (tierConfig.soldCount + tierReserved + bookedTicket.quantity > tierConfig.totalCapacity) {
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_CAPACITY_EXHAUSTED';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session);
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
              _payment.failureReason = 'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN';
              await _payment.save({ session });
              await this.triggerRefundRequest(booking, _payment, _payment.failureReason, session);
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
            incUpdate[`ticketTiers.${tierIndex}.soldCount`] = bookedTicket.quantity;
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
              
              eventQuery[`ticketTiers.${tierIndex}.soldCount`] = {
                $lte: event.ticketTiers[tierIndex].totalCapacity - tierReserved - bookedTicket.quantity
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

        // 4. Booking Confirmation Status Transition
        const previousBookingDoc = await Booking.findOneAndUpdate(
          { _id: booking._id, status: { $in: [BookingStatus.AWAITING_PAYMENT, BookingStatus.EXPIRED, BookingStatus.EXPIRING] } },
          { $set: { status: BookingStatus.CONFIRMED, paymentId: _payment._id }, $unset: { expiresAt: 1, logicalExpiresAt: 1 }, $inc: { bookingVersion: 1 } },
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
                    },
                  },
                  { upsert: true, new: true, setDefaultsOnInsert: true, session }
                );
                generatedTickets.push(ticket);
                ticketIndex++;
              }
            } else {
              const tierConfig = event?.ticketTiers?.find(t => t.tier === bookedTicket.tier);
              const admits = tierConfig?.groupSize || 1;

              for (let i = 0; i < bookedTicket.quantity; i++) {
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
                      admits,
                      qrCode: qrCodeText,
                      qrCodeImage: `/api/public/tickets/${ticketId}/qr`,
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
      
      let reason = 'CONFIRMATION_TRANSACTION_FAILED';
      let isConcurrentConfirm = false;
      const isKnownAbort = ['SEAT_ALLOCATION_FAILED', 'EVENT_CAPACITY_ALLOCATION_FAILED', 'CONCURRENT_CONFIRMATION_OR_NOT_FOUND'].includes(err.message);

      if (err.message === 'SEAT_ALLOCATION_FAILED' || err.message === 'EVENT_CAPACITY_ALLOCATION_FAILED') {
        reason = 'LATE_PAYMENT_RECOVERY_REJECTED_SEATS_TAKEN';
      } else if (err.message === 'CONCURRENT_CONFIRMATION_OR_NOT_FOUND') {
        reason = 'LATE_PAYMENT_RECOVERY_REJECTED_CONCURRENT_CONFIRM';
        const currentBooking = await Booking.findById(booking._id).select('status').lean().catch(() => null);
        if (currentBooking?.status === BookingStatus.CONFIRMED) {
          isConcurrentConfirm = true;
        }
      }
      
      _payment.failureReason = reason;
      try {
        await _payment.save();
      } catch (saveErr) {
        // ignore
      }
      if (!isConcurrentConfirm) {
        await this.triggerRefundRequest(booking, _payment, _payment.failureReason).catch(() => {});
      }

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
}
