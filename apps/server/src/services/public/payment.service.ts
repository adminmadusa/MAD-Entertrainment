import { ClientSession } from 'mongoose';

import { BookingStatus, PaymentStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { emitToAdmin, emitToBooking, emitToEvent } from '../../config/socket';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { IPayment } from '../../models/payment.schema';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';
import { generateTicketPDF } from '../../utils/pdf';
import { runInTransaction } from '../../utils/transaction';
import { CacheService } from '../cache.service';
import { QueueService } from '../queue.service';
import { PaymentBookingService } from './payment-booking.service';
import { PublicBookingService } from './booking.service';
import { PaymentIntentService } from './payment-intent.service';
import { PaymentRefundService } from './payment-refund.service';
import { PaymentVerifyService } from './payment-verify.service';
import { PaymentWebhookService } from './payment-webhook.service';
import type { StripeChargeWebhookPayload, StripeRefundWebhookPayload, RazorpayRefundWebhookPayload } from './payment.types';

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
  static assertBookingOwnership(booking: IBooking, ownershipContext: PaymentOwnershipContext): void {
    if (ownershipContext.trustedInternal) {
      return;
    }

    PublicBookingService.assertBookingAccess(
      booking,
      { userId: ownershipContext.userId, sessionId: ownershipContext.sessionId },
      'ActiveCheckout'
    );
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
    return PaymentWebhookService.confirmFromWebhook(
      razorpayOrderId,
      razorpayPaymentId,
      eventType,
      webhookEventId,
      {
        confirmBooking: (booking, payment) => this.confirmBooking(booking, payment),
        failPaymentAndReleaseInventory: (booking, payment, reason, source, code) =>
          this.failPaymentAndReleaseInventory(booking, payment, reason, source, code),
      },
      amountPaise,
      currency
    );
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
    return PaymentWebhookService.confirmFromWebhookStripe(
      intent,
      webhookEventId,
      {
        confirmBooking: (booking, payment) => this.confirmBooking(booking, payment),
        failPaymentAndReleaseInventory: (booking, payment, reason, source, code) =>
          this.failPaymentAndReleaseInventory(booking, payment, reason, source, code),
      }
    );
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
            } catch (_saveErr) {
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
      } catch (_saveErr) {
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


  static async reconcileStripeRefundWebhook(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    return PaymentWebhookService.reconcileStripeRefundWebhook(
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
    return PaymentWebhookService.reconcileRazorpayRefundWebhook(
      refundEntity,
      eventType,
      webhookEventId
    );
  }
}
