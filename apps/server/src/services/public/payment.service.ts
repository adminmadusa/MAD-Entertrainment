import crypto from 'crypto';

import * as Sentry from '@sentry/node';
import { Types, ClientSession } from 'mongoose';

import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType, RefundStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { paymentFailureHtml, fullRefundHtml, partialRefundHtml } from '../../lib/email';
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
import { auditLog } from '../../utils/audit';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';
import { generateTicketPDF } from '../../utils/pdf';
import { runInTransaction } from '../../utils/transaction';
import { cancelBooking, executeCancelBookingSideEffects } from '../admin/booking.service';
import { CacheService } from '../cache.service';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { ReservationService } from '../reservation.service';
import { PublicBookingService } from './booking.service';
import { PaymentBookingService } from './payment-booking.service';
import { PaymentInventoryService } from './payment-inventory.service';
import { PaymentRefundService } from './payment-refund.service';
import { PaymentValidationService } from './payment-validation.service';
import type { StripeChargeWebhookPayload, StripeRefundWebhookPayload, RazorpayRefundWebhookPayload } from './payment.types';
import { RazorpayAdapter } from './razorpay.adapter';
import { StripeAdapter } from './stripe.adapter';
import { PaymentIntentService } from './payment-intent.service';
import { PaymentVerifyService } from './payment-verify.service';

export type {
  StripeChargeWebhookPayload,
  StripeRefundWebhookPayload,
  RazorpayRefundWebhookPayload,
} from './payment.types';


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

  static async createPaymentIntent(
    bookingId: string,
    gateway: 'stripe' | 'razorpay',
    ownershipContext: PaymentOwnershipContext = {}
  ) {
    return PaymentIntentService.createPaymentIntent(
      bookingId,
      gateway,
      ownershipContext,
      (booking, payment) => this.confirmBooking(booking, payment)
    );
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
    return PaymentVerifyService.verifyPayment(
      bookingId,
      gatewayPayload,
      ownershipContext,
      {
        confirmBooking: (booking, payment) => this.confirmBooking(booking, payment),
        failPaymentAndReleaseInventory: (booking, payment, reason, source, code) =>
          this.failPaymentAndReleaseInventory(booking, payment, reason, source, code),
      }
    );
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
