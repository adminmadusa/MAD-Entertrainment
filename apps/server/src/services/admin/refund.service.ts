import crypto from 'crypto';

import { BookingStatus, NotificationType, PaymentStatus, RefundStatus } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { fullRefundHtml, partialRefundHtml } from '../../lib/email';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund, IRefund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { auditLog } from '../../utils/audit';
import { logger } from '../../utils/logger';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { executeCancelBookingSideEffects } from './booking.service';
import { RefundValidationService } from './refund/refund-validation.service';
import { RefundGatewayService } from './refund/refund-gateway.service';
import { RefundLifecycleService } from './refund/refund-lifecycle.service';

export const createRefund = async (data: {
  bookingId: string;
  paymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey?: string;
  origin?: 'manual' | 'auto_recovery';
  recoveryReason?: 'AMOUNT_MISMATCH' | 'BOOKING_REFERENCE_MISMATCH' | 'BOOKING_ID_MISMATCH' | 'CURRENCY_MISMATCH' | 'PAYMENT_VALIDATION_FAILURE';
  cancelTickets?: boolean;
}): Promise<IRefund> => {
  // 1. Service-Level positive amount check (Defense in depth)
  if (data.amount <= 0) {
    throw AppError.badRequest('Refund amount must be greater than zero');
  }

  const idempotencyKey = data.idempotencyKey || `manual-refund-${crypto.randomUUID()}`;

  try {
    const result = await RefundLifecycleService.createRefundRecord({
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      idempotencyKey,
      origin: data.origin,
      recoveryReason: data.recoveryReason,
      cancelTickets: data.cancelTickets,
    });
    return result;
  } catch (err: any) {
    const isDuplicateKey = err.code === 11000 || err.code === '11000' || err.message?.includes('E11000');
    if (isDuplicateKey) {
      logger.warn({ idempotencyKey }, 'Duplicate refund request creation race detected. Recovering existing refund.');
      const existing = await Refund.findOne({
        idempotencyKey,
      });
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
};

export const getRefunds = async (
  page: number = 1,
  limit: number = 15,
  status?: string
): Promise<{ refunds: IRefund[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;
  const filter: Record<string, any> = {};
  if (status) {
    filter.status = status;
  }

  const total = await Refund.countDocuments(filter);
  const refunds = await Refund.find(filter)
    .populate({
      path: 'bookingId',
      select: 'bookingId totalAmount status eventId guestInfo userId createdAt totalTickets ticketsScanned',
      populate: { path: 'eventId', select: 'title startDate venue' }
    })
    .populate('paymentId', 'gatewayPaymentId amount status gateway')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    refunds,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const processRefund = async (
  id: string,
  action: 'approve' | 'reject',
  adminNotes?: string,
  gatewayRefundId?: string,
  manualOverride?: boolean,
  overrideReason?: string,
  actor?: { id: string; role: string }
): Promise<IRefund | null> => {
  let phase1Result: {
    refund: IRefund;
    payment: any;
    booking: any;
    totalRefundedSoFar: number;
    scannedTicketsCount: number;
  } | null = null;

  try {
    // Phase 1: Claim and Reserve within a transaction session
    phase1Result = await RefundLifecycleService.claimRefundRecord(id);
  } catch (err: any) {
    logger.error({ err, refundId: id }, 'Error in Phase 1 of processing refund. Reverting status to requested.');
    await RefundLifecycleService.revertClaimRefundRecord(id).catch((revertErr) => {
      logger.error({ revertErr, refundId: id }, 'Failed to revert refund status to requested.');
    });
    throw err;
  }

  const { refund, payment, booking, totalRefundedSoFar, scannedTicketsCount } = phase1Result;
  let result = null;

  try {
    // 5. Action Reject Path
    if (action === 'reject') {
      result = await RefundLifecycleService.rejectRefund(refund, adminNotes);
    } else {
      // Validate processing constraints
      RefundValidationService.validateRefundProcessingConstraints({
        refund,
        payment,
        booking,
        scannedTicketsCount,
        totalRefundedSoFar,
        manualOverride,
        actor,
      });

      // 6. Action Approve Path: Execute gateway refund API call (Phase 2)
      let finalGatewayRefundId = gatewayRefundId;

      if (manualOverride) {
        if (!overrideReason || overrideReason.trim() === '') {
          throw AppError.badRequest('Manual override requires an override reason');
        }
        if (!gatewayRefundId || gatewayRefundId.trim() === '') {
          throw AppError.badRequest('Manual override requires a gateway refund ID');
        }
        // Emit manual override audit event
        auditLog({
          action: 'REFUND_MANUAL_OVERRIDE',
          // PRICING-003: Use real actor identity instead of hardcoded 'system'
          actor: { type: 'admin', id: actor?.id || 'system' },
          status: 'success',
          metadata: {
            refundId: refund._id.toString(),
            paymentId: payment._id.toString(),
            bookingId: booking._id.toString(),
            amount: refund.amount,
            gatewayRefundId,
            overrideReason,
          },
          description: `Manual override executed for refund ${refund._id}. Reason: ${overrideReason}`,
        });
      } else {
        const response = await RefundGatewayService.executeGatewayRefund({
          payment,
          refund,
          gatewayRefundId,
        });
        finalGatewayRefundId = response.id;
      }

      if (finalGatewayRefundId) {
        await RefundLifecycleService.persistGatewayRefundId(refund._id.toString(), finalGatewayRefundId).catch((err) => {
          logger.error({ err, refundId: refund._id.toString() }, 'Failed to persist gatewayRefundId immediately.');
        });
        refund.gatewayRefundId = finalGatewayRefundId;
      }

      // Phase 3: Finalization (inside second transaction session)
      result = await RefundLifecycleService.finalizeRefundApproval({
        refund,
        adminNotes,
        gatewayRefundId: finalGatewayRefundId,
        totalRefundedSoFar,
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
        cancelTickets: refund.cancelTickets,
        actor,
      });
    }
  } catch (err: any) {
    // Phase 4: Conditional Failure Recovery
    logger.error({ err, refundId: id }, 'Error processing refund. Reverting status to requested.');
    await RefundLifecycleService.revertClaimRefundRecord(id).catch((revertErr) => {
      logger.error({ revertErr, refundId: id }, 'Failed to revert refund status to requested.');
    });
    throw err;
  }

  if (result) {
    const { updated, cancelPostCommitPayload } = result;

    // Execute cancelBooking post-commit side effects sequentially with error isolation
    if (cancelPostCommitPayload) {
      try {
        await executeCancelBookingSideEffects(cancelPostCommitPayload);
      } catch (err) {
        logger.error({ err }, 'Error executing booking cancel side effects post-commit in processRefund');
      }
    }

    // Asynchronous, exception-safe Full & Partial Refund Email Trigger
    if (updated.status === RefundStatus.COMPLETED && !updated.reconciledAt) {
      try {
        const booking = await Booking.findById(updated.bookingId).populate('eventId');
        if (booking && booking.guestEmail) {
          const event = booking.eventId as any;
          const refundAmount = updated.amount;
          const totalAmount = booking.totalAmount;

          let emailHtml = '';
          let subject = '';
          let notificationType: NotificationType | undefined;

          // Check if it's full or partial based on cumulative refund amount vs booking totalAmount
          const completedRefunds = await Refund.find({
            paymentId: updated.paymentId,
            status: RefundStatus.COMPLETED
          });
          const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);
          const payment = await Payment.findById(updated.paymentId);
          const isFullRefund = payment ? totalRefunded === payment.amount : false;

          if (isFullRefund) {
            // Task 2: Full Refund
            const existingNotification = await Notification.findOne({
              jobId: { $regex: `^refund-${updated._id}` }
            });

            if (!existingNotification) {
              const formattedRefundDate = new Date(updated.processedAt || new Date()).toLocaleDateString('en-IN', {
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
            // Task 3: Partial Refund
            const existingNotification = await Notification.findOne({
              jobId: { $regex: `^refund-${updated._id}` }
            });

            if (!existingNotification) {
              emailHtml = await partialRefundHtml({
                customerName: booking.guestName,
                bookingReference: booking.bookingId,
                originalAmount: totalAmount,
                refundAmount: refundAmount,
                remainingAmount: Math.max(0, totalAmount - totalRefunded),
                reason: updated.reason || 'Tier adjustment refund',
                currency: booking.currency || 'INR',
              });

              subject = `Partial Refund Processed for ${booking.bookingId}`;
              notificationType = NotificationType.PARTIAL_REFUND;
            }
          }

          if (emailHtml && notificationType) {
            const jobId = `refund-${updated._id}-${Date.now()}`;

            // Post-commit failure isolation: Notification creation and Email Enqueue
            try {
              // Post-commit ordering constraint: createNotificationSafe must succeed before QueueService.enqueue
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

              // If createNotificationSafe throws, this statement is skipped
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
                eventId: event?._id?.toString() || booking.eventId.toString(),
                timestamp: new Date().toISOString(),
                success: true
              }, 'Refund email queued successfully.');
            } catch (err: any) {
              logger.error({
                err,
                emailType: isFullRefund ? 'FULL_REFUND' : 'PARTIAL_REFUND',
                bookingId: updated.bookingId.toString(),
                timestamp: new Date().toISOString(),
                success: false
              }, 'Failed to queue refund email post-commit.');
            }
          } else {
            logger.info({ bookingId: booking._id }, 'Refund email already queued or sent; skipping duplicate.');
          }
        }
      } catch (err: any) {
        logger.error({
          err,
          emailType: 'REFUND_PROCESSED_PRE_PREPARATION',
          bookingId: updated.bookingId.toString(),
          timestamp: new Date().toISOString(),
          success: false
        }, 'Failed to prepare refund email post-commit.');
      }
    }

    return updated;
  }

  return null;
};
