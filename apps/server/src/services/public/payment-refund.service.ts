/**
 * PaymentRefundService
 *
 * Extracted from PaymentService as part of ARCH-001 Phase 3.
 *
 * Owns all automatic refund creation, payment failure + inventory release,
 * webhook refund reconciliation, and refund email notification logic.
 *
 * Public API boundary:
 *   - triggerRefundRequest        — auto-refund record creation (session-aware)
 *   - failPaymentAndReleaseInventory — payment failure + inventory cleanup
 *   - reconcileStripeRefundWebhook  — Stripe refund webhook handler (called via PaymentService wrapper)
 *   - reconcileRazorpayRefundWebhook — Razorpay refund webhook handler (called via PaymentService wrapper)
 *
 * Controllers do NOT import this service directly.
 * PaymentService exposes thin wrapper delegates for reconcile methods.
 * consistency.service.ts imports triggerRefundRequest directly.
 *
 * Governance: ARCH-001 Phase 3 — do not add business logic here.
 */

import * as Sentry from '@sentry/node';
import { ClientSession } from 'mongoose';

import { BookingStatus, NotificationType, PaymentStatus, RefundStatus } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getQueueName } from '../../config/queue.config';
import { fullRefundHtml, partialRefundHtml, paymentFailureHtml } from '../../lib/email';
import { Booking, IBooking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment, IPayment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { runInTransaction } from '../../utils/transaction';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { BookingLifecycleService } from './booking/booking-lifecycle.service';
import { PaymentInventoryService } from './payment-inventory.service';
import type { StripeChargeWebhookPayload, StripeRefundWebhookPayload, RazorpayRefundWebhookPayload, NormalizedRefundData } from './payment.types';
import { RazorpayRefundService } from './payment/razorpay-refund.service';
import { StripeRefundService } from './payment/stripe-refund.service';

const { cancelBooking, executeCancelBookingSideEffects } = BookingLifecycleService;


// ─────────────────────────────────────────────────────────────────────────────

export class PaymentRefundService {
  // ─── Auto-Refund Request Creation ──────────────────────────────────────────

  /**
   * Creates an automatic Refund record in `requested` status.
   * Idempotent: guards against concurrent creation via paymentId + status check
   * and E11000 duplicate key handling.
   *
   * Session-aware: if `session` is provided the write participates in the
   * caller's MongoDB transaction (used within confirmBooking late recovery path).
   */
  static async triggerRefundRequest(
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
          currency: booking.currency || 'USD',
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

  // ─── Payment Failure + Inventory Release ───────────────────────────────────

  /**
   * Marks the payment as FAILED, persists the failure reason, and releases
   * all inventory held by the booking (reservations, seat locks).
   *
   * Also enqueues a payment failure notification email if the booking has a
   * guest email address and one has not already been sent.
   *
   * Does NOT participate in a caller-owned transaction — each write is
   * sequential and independently idempotent.
   */
  static async failPaymentAndReleaseInventory(
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
      await PaymentRefundService.triggerRefundRequest(booking, payment, reason, undefined, origin, recoveryReason).catch(() => {});
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

    await PaymentInventoryService.releaseInventoryForFailedPayment(booking, payment, reason);

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
  }

  // ─── Webhook Refund Reconciliation — Public Entry Points ───────────────────

  /**
   * Handles `charge.refunded` and `refund.updated` / `refund.failed` Stripe events.
   * Called by `PaymentService.reconcileStripeRefundWebhook` (thin wrapper, Option A).
   */
  static async reconcileStripeRefundWebhook(
    chargeOrRefund: StripeChargeWebhookPayload | StripeRefundWebhookPayload,
    webhookEventId: string,
    eventType: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    const parseResult = StripeRefundService.parseStripeRefund(chargeOrRefund, webhookEventId, eventType);
    if (parseResult.status === 'skipped') {
      return { status: 'skipped' };
    }
    return PaymentRefundService.reconcileRefundWebhook(parseResult.data);
  }

  /**
   * Handles `refund.processed` and `refund.failed` Razorpay events.
   * Called by `PaymentService.reconcileRazorpayRefundWebhook` (thin wrapper, Option A).
   */
  static async reconcileRazorpayRefundWebhook(
    refundEntity: RazorpayRefundWebhookPayload,
    eventType: string,
    webhookEventId: string
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
    const parseResult = RazorpayRefundService.parseRazorpayRefund(refundEntity, eventType, webhookEventId);
    if (parseResult.status === 'skipped') {
      return { status: 'skipped' };
    }
    return PaymentRefundService.reconcileRefundWebhook(parseResult.data);
  }

  // ─── Core Reconciliation (Private) ─────────────────────────────────────────

  private static async reconcileRefundWebhook(
    params: NormalizedRefundData
  ): Promise<{ status: 'completed' | 'failed' | 'anomaly' | 'skipped'; refundId?: string; paymentId?: string }> {
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
              await PaymentRefundService.triggerRefundEmailNotification(result.refundId);
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
          await PaymentRefundService.triggerRefundEmailNotification(result.refundId);
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

  // ─── Post-Commit Refund Email Notification (Private) ───────────────────────

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
            currency: booking.currency || 'USD',
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
            currency: booking.currency || 'USD',
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
