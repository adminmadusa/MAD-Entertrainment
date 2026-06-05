import { Refund, IRefund } from '../../models/refund.schema';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { runInTransaction, cancelBooking, executeCancelBookingSideEffects } from './booking.service';
import { AppError } from '../../middleware/error.middleware';
import { BookingStatus, NotificationType, PaymentStatus } from '@mad/shared';
import { Notification } from '../../models/notification.schema';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { getQueueName } from '../../config/queue.config';
import { logger } from '../../utils/logger';
import { fullRefundHtml, partialRefundHtml } from '../../lib/email';

import crypto from 'crypto';

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
    const result = await runInTransaction(async (session) => {
      // 2. Fetch and verify Payment record exists
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw AppError.notFound('Payment record not found');
      }

      // 3. Payment ↔ Booking Relationship Verification
      if (payment.bookingId.toString() !== data.bookingId) {
        throw AppError.badRequest('Payment does not belong to booking');
      }

      // 4. Payment status validation (Must be PAID or PARTIALLY_REFUNDED)
      if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
        throw AppError.badRequest('Only successful paid or partially refunded payments can be refunded');
      }

      // 5. Fetch and verify Booking record exists and is CONFIRMED
      const booking = await Booking.findById(data.bookingId).session(session);
      if (!booking) {
        throw AppError.notFound('Booking record not found');
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw AppError.badRequest('Only confirmed bookings can be refunded');
      }

      // 6. Individual Amount Cap Check
      if (data.amount > payment.amount) {
        throw AppError.badRequest('Refund amount cannot exceed original payment amount');
      }

      // Check for existing refund request with same idempotency key if provided
      const existingRefund = await Refund.findOne({
        idempotencyKey: idempotencyKey,
        status: { $in: ['requested', 'processing', 'completed'] },
      }).session(session);
      if (existingRefund) {
        logger.info({ idempotencyKey }, 'Refund request already exists. Skipping duplicate.');
        return existingRefund;
      }

      // 7. Cumulative Refund Check (Summing requested and completed)
      const existingRefunds = await Refund.find({
        paymentId: payment._id,
        status: { $in: ['requested', 'completed'] },
      }).session(session);
      const existingSum = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
      if (existingSum + data.amount > payment.amount) {
        const remaining = payment.amount - existingSum;
        throw AppError.badRequest(`Cumulative refund amount exceeds original payment amount (Paid: ₹${payment.amount}, Refunded/Requested: ₹${existingSum}, Max Remaining: ₹${remaining})`);
      }

      const refund = new Refund({
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        status: 'requested',
        idempotencyKey,
        origin: data.origin || 'manual',
        recoveryReason: data.recoveryReason,
        cancelTickets: data.cancelTickets || false,
      });
      return await refund.save({ session });
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
  gatewayRefundId?: string
): Promise<IRefund | null> => {
  const result = await runInTransaction(async (session) => {
    // 1. Transaction-safe atomic load and claim of the requested Refund document
    const refund = await Refund.findOneAndUpdate(
      { _id: id, status: 'requested' },
      { $set: { status: 'processing' } },
      { new: true, session }
    );
    if (!refund) {
      throw AppError.badRequest('Refund request not found or has already been processed');
    }

    if (action === 'reject') {
      refund.status = 'failed';
      refund.adminNotes = adminNotes;
      refund.processedAt = new Date();
      await refund.save({ session });
      return { updated: refund, cancelPostCommitPayload: null };
    }

    let totalRefundedSoFar = 0;
    let payment = null;
    let cancelPostCommitPayload = null;

    // 2. Transaction-safe verification of the Payment record
    payment = await Payment.findById(refund.paymentId).session(session);
    if (!payment) {
      throw AppError.notFound('Payment record not found');
    }

    // 3. Validation: Payment status must not be fully refunded already
    if (payment.status === PaymentStatus.REFUNDED) {
      throw AppError.badRequest('Payment has already been fully refunded');
    }
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw AppError.badRequest('Only successful paid or partially refunded payments can be refunded');
    }

    // 4. Validation: Booking status must be CONFIRMED or CANCELLED
    const booking = await Booking.findById(refund.bookingId).session(session);
    if (!booking) {
      throw AppError.notFound('Booking record not found');
    }
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.CANCELLED) {
      throw AppError.badRequest('Only confirmed or cancelled bookings can be refunded');
    }

    // 5. Validation: Cumulative processed refunds cap check inside the session transaction
    const completedRefunds = await Refund.find({
      paymentId: payment._id,
      status: 'completed',
      _id: { $ne: refund._id }
    }).session(session);
    totalRefundedSoFar = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

    if (totalRefundedSoFar + refund.amount > payment.amount) {
      throw AppError.badRequest(`Refund amount exceeds remaining captured balance (Paid: ₹${payment.amount}, Refunded: ₹${totalRefundedSoFar}, Attempted: ₹${refund.amount})`);
    }

    // 6. Update the Refund request status atomically to completed
    refund.status = 'completed';
    refund.adminNotes = adminNotes;
    if (gatewayRefundId) {
      refund.gatewayRefundId = gatewayRefundId;
    }
    refund.processedAt = new Date();
    await refund.save({ session });

    const updated = refund;

    // Trigger booking status changes and inventory release depending on full/partial refund options
    const isFullRefund = (totalRefundedSoFar + updated.amount) === payment.amount;
    const newPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

    // Call cancelBooking conditionally first
    if (isFullRefund) {
      // Full refund cancels booking with REFUNDED status
      if (booking.status === BookingStatus.CONFIRMED) {
        const cancelResult = await cancelBooking(updated.bookingId.toString(), adminNotes || 'Admin Refund Processed', session, BookingStatus.REFUNDED);
        if (cancelResult && cancelResult.postCommitPayload) {
          cancelPostCommitPayload = cancelResult.postCommitPayload;
        }
      } else if (booking.status === BookingStatus.CANCELLED) {
        // If it was already cancelled, we transition the booking to REFUNDED status
        booking.status = BookingStatus.REFUNDED;
        booking.bookingVersion += 1;
        await booking.save({ session });
      }
    } else if (updated.cancelTickets) {
      // Partial refund with cancelTickets = true cancels booking with CANCELLED status
      if (booking.status === BookingStatus.CONFIRMED) {
        const cancelResult = await cancelBooking(updated.bookingId.toString(), adminNotes || 'Admin Refund Processed', session, BookingStatus.CANCELLED);
        if (cancelResult && cancelResult.postCommitPayload) {
          cancelPostCommitPayload = cancelResult.postCommitPayload;
        }
      }
    }

    // Update payment status after cancelBooking so that it overrides the cancelBooking payment status change
    await Payment.findByIdAndUpdate(
      updated.paymentId,
      { status: newPaymentStatus },
      { session }
    );

    return { updated, cancelPostCommitPayload };
  });

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
    if (updated.status === 'completed') {
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
            status: 'completed'
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
              await createNotificationSafe([{
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
              }]);

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
