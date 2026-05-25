import crypto from 'crypto';
import { Types } from 'mongoose';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { getEnv } from '../../config/env';
import { getRazorpay, isRazorpayEnabled } from '../../config/razorpay';
import { getStripe, isStripeEnabled } from '../../config/stripe';
import { AppError } from '../../middleware/error.middleware';
import { Booking, IBooking } from '../../models/booking.schema';
import { Coupon } from '../../models/coupon.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { sendEmail } from '../../utils/email';
import { generateTicketPDF } from '../../utils/pdf';
import { ReservationService } from '../reservation.service';
import { QueueService } from '../queue.service';
import { CacheService } from '../cache.service';

export class PaymentService {
  static async createPaymentIntent(bookingId: string, gateway: 'stripe' | 'razorpay') {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
    }

    const env = getEnv();

    if (gateway === 'razorpay') {
      return this.handleRazorpayIntent(booking, env);
    }

    return this.handleStripeIntent(booking, env);
  }

  private static async handleRazorpayIntent(booking: IBooking, env: ReturnType<typeof getEnv>) {
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
    webhookEventId: string
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

  static async verifyPayment(bookingId: string, gatewayPayload: any) {

    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
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
        },
        description: `Verified Razorpay payment ${razorpay_payment_id} for booking ${booking.bookingId}`
      });

      confirmedBooking = await this.confirmBooking(booking, payment);
    } else {
      // ── Stripe verification (PR-02 hardened) ──────────────────────────────────
      const { paymentIntentId } = gatewayPayload;
      if (!paymentIntentId) {
        throw AppError.badRequest('Missing Stripe paymentIntentId in payment payload');
      }

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

    if (confirmedBooking) {
      return confirmedBooking;
    }

    const latestBooking = await Booking.findById(booking._id);
    return latestBooking || booking;
  }

  private static safeEmit(label: string, emit: () => void, data: Record<string, unknown>) {
    try {
      emit();
    } catch (err) {
      logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
    }
  }

  private static async failPaymentAndReleaseInventory(booking: IBooking, payment: IPayment, reason: string) {
    payment.status = PaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

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
    // 1. Confirm booking status exactly once. Concurrent payment callbacks must
    // not double-increment event inventory or create duplicate tickets.
    const confirmedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: BookingStatus.AWAITING_PAYMENT },
      { $set: { status: BookingStatus.CONFIRMED }, $unset: { expiresAt: 1 }, $inc: { bookingVersion: 1 } },
      { new: true }
    );

    if (!confirmedBooking) {
      const currentBooking = await Booking.findById(booking._id).select('status bookingId').lean();
      logger.info(
        {
          bookingId: booking._id,
          paymentId: _payment._id,
          gateway: _payment.gateway,
          correlationId: booking.bookingId,
          existingStatus: currentBooking?.status,
        },
        'payment_confirmation_skipped'
      );
      return null;
    }

    booking = confirmedBooking;
    const confirmedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.CONFIRMED, {
      paymentReference: _payment.gatewayPaymentId ?? _payment.gatewayOrderId,
      paymentId: _payment._id as any,
      reason: 'payment-confirmed',
      correlationId: booking.bookingId,
    });
    await ReservationService.confirmCapacity(confirmedReservations);

    // 2. Update Event statistics
    const event = await Event.findById(booking.eventId);
    if (event) {
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

      const updatedEvent = await Event.findOneAndUpdate(
        { _id: booking.eventId },
        { $inc: incUpdate },
        { new: true }
      );

      if (updatedEvent && updatedEvent.soldCount >= updatedEvent.totalCapacity && !updatedEvent.isSoldOut) {
        await Event.updateOne({ _id: booking.eventId }, { $set: { isSoldOut: true } });
      }

      await CacheService.delPattern('events:*');
    }

    // 3. Update Seat Layout statuses from LOCKED to BOOKED
    if (event && event.bookingMode === 'seat_based') {
      const allSeatIds = booking.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
      await SeatLayout.updateOne(
        { eventId: event._id },
        {
          $set: {
            'seats.$[seat].status': SeatStatus.BOOKED,
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
              'seat.bookedByBookingId': booking._id.toString(), // Hardens against seat hijacking
            },
          ],
        }
      );

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

    // 4. Update Coupon used count if applied
    if (booking.couponId) {
      await Coupon.findByIdAndUpdate(booking.couponId, { $inc: { usedCount: 1 } });
    }

    // Feature Flag Rollout: if asynchronous checkout is enabled, offload ticket & PDF generation
    if (getEnv().ENABLE_ASYNC_CHECKOUT) {
      await QueueService.enqueue(
        'booking-queue',
        'booking:confirm',
        { bookingId: booking._id.toString() },
        `booking:confirm:${booking._id}`
      );
      logger.info({ bookingId: booking._id }, 'Asynchronous checkout enabled. Handed off confirmation tasks to background queue.');
      return booking;
    }

    // 5. Generate scan-ready QR Tickets
    let ticketIndex = 1;
    for (const bookedTicket of booking.tickets) {
      if (event && event.bookingMode === 'seat_based' && bookedTicket.seats) {
        for (const seat of bookedTicket.seats) {
          const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
          const qrCodeText = JSON.stringify({
            ticketId,
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
            tier: bookedTicket.tier,
            seatId: seat.seatId,
            admits: 1,
          });

          await Ticket.create({
            ticketId,
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
            qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`,
          });
          ticketIndex++;
        }
      } else {
        // General admission - generate QRs matching count
        const tierConfig = event?.ticketTiers?.find(t => t.tier === bookedTicket.tier);
        const admits = tierConfig?.groupSize || 1;

        for (let i = 0; i < bookedTicket.quantity; i++) {
          const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
          const qrCodeText = JSON.stringify({
            ticketId,
            bookingId: booking._id.toString(),
            eventId: booking.eventId.toString(),
            tier: bookedTicket.tier,
            admits,
          });

          await Ticket.create({
            ticketId,
            bookingId: booking._id,
            eventId: booking.eventId,
            tierName: bookedTicket.tierName,
            tier: bookedTicket.tier,
            admits,
            qrCode: qrCodeText,
            qrCodeImage: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`,
          });
          ticketIndex++;
        }
      }
    }

    // 6. Generate PDF and Send Email asynchronously
    try {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Hi ${booking.guestName},</h2>
          <p>Your booking <strong>${booking.bookingId}</strong> for the event <strong>"${event?.title || 'MAD Event'}"</strong> has been successfully confirmed!</p>
          <p>Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.</p>
          <p>Enjoy the show!</p>
          <br/>
          <p>MAD Entertainment Team</p>
        </div>
      `;

      // Generate the PDF buffer
      const pdfBuffer = await generateTicketPDF(booking, event);

      // Send the email with the PDF attachment
      if (booking.guestEmail) {
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
      }

      await Notification.create({
        type: NotificationType.BOOKING_CONFIRMED,
        bookingId: booking._id,
        eventId: booking.eventId,
        channel: 'email',
        recipient: booking.guestEmail,
        subject: `Booking Confirmed: ${booking.bookingId}`,
        body: 'Email dispatched with PDF ticket attached.',
        isSent: true,
        retryCount: 0,
      });

      logger.info({ bookingId: booking._id }, 'Notification log created for confirmed booking and email dispatched');
    } catch (err) {
      logger.error({ err }, 'Failed to record notification confirmation log or send email');
    }
    return booking;
  }
}
