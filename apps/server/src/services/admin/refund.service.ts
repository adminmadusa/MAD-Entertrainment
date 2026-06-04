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

export const createRefund = async (data: {
  bookingId: string;
  paymentId: string;
  amount: number;
  reason?: string;
}): Promise<IRefund> => {
  // 1. Service-Level positive amount check (Defense in depth)
  if (data.amount <= 0) {
    throw AppError.badRequest('Refund amount must be greater than zero');
  }

  // 2. Fetch and verify Payment record exists
  const payment = await Payment.findById(data.paymentId);
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
  const booking = await Booking.findById(data.bookingId);
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

  // 7. Cumulative Refund Check (Summing requested and completed)
  const existingRefunds = await Refund.find({
    paymentId: payment._id,
    status: { $in: ['requested', 'completed'] },
  });
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
  });
  return await refund.save();
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
    const status = action === 'approve' ? 'completed' : 'failed';

    // 1. Transaction-safe atomic load of the requested Refund document
    const refund = await Refund.findOne({ _id: id, status: 'requested' }).session(session);
    if (!refund) {
      throw AppError.badRequest('Refund request not found or has already been processed');
    }

    let totalRefundedSoFar = 0;
    let payment = null;
    let cancelPostCommitPayload = null;

    if (status === 'completed') {
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

      // 4. Validation: Booking status must be CONFIRMED
      const booking = await Booking.findById(refund.bookingId).session(session);
      if (!booking) {
        throw AppError.notFound('Booking record not found');
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw AppError.badRequest('Only confirmed bookings can be refunded');
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
    }

    // 6. Update the Refund request status atomically
    refund.status = status;
    refund.adminNotes = adminNotes;
    if (gatewayRefundId) {
      refund.gatewayRefundId = gatewayRefundId;
    }
    refund.processedAt = new Date();
    await refund.save({ session });

    const updated = refund;

    if (status === 'completed' && payment) {
      // Trigger core booking, seat, and inventory cancellation cleanup
      const cancelResult = await cancelBooking(updated.bookingId.toString(), adminNotes || 'Admin Refund Processed', session, BookingStatus.REFUNDED);
      if (cancelResult && cancelResult.postCommitPayload) {
        cancelPostCommitPayload = cancelResult.postCommitPayload;
      }

      // 7. Enforce Payment Status Synchronization (Full vs. Partial)
      const isFullRefund = (totalRefundedSoFar + updated.amount) === payment.amount;
      const newPaymentStatus = isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

      await Payment.findByIdAndUpdate(
        updated.paymentId,
        { status: newPaymentStatus },
        { session }
      );
    }

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

          if (refundAmount === totalAmount) {
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
          } else if (refundAmount < totalAmount) {
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
                remainingAmount: totalAmount - refundAmount,
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
                emailType: refundAmount === totalAmount ? 'FULL_REFUND' : 'PARTIAL_REFUND',
                recipient: booking.guestEmail,
                bookingId: booking._id.toString(),
                eventId: event?._id?.toString() || booking.eventId.toString(),
                timestamp: new Date().toISOString(),
                success: true
              }, 'Refund email queued successfully.');
            } catch (err: any) {
              logger.error({
                err,
                emailType: refundAmount === totalAmount ? 'FULL_REFUND' : 'PARTIAL_REFUND',
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
