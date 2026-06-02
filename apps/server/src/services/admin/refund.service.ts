import { Refund, IRefund } from '../../models/refund.schema';
import { Booking } from '../../models/booking.schema';
import { Payment } from '../../models/payment.schema';
import { runInTransaction, cancelBooking } from './booking.service';
import { AppError } from '../../middleware/error.middleware';
import { BookingStatus, NotificationType } from '@mad/shared';
import { Notification } from '../../models/notification.schema';
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
  return runInTransaction(async (session) => {
    const status = action === 'approve' ? 'completed' : 'failed';

    const updated = await Refund.findOneAndUpdate(
      { _id: id, status: 'requested' },
      {
        status,
        adminNotes,
        gatewayRefundId,
        processedAt: new Date(),
      },
      { new: true, session }
    );

    if (!updated) {
      throw AppError.badRequest('Refund request not found or has already been processed');
    }

    if (status === 'completed') {
      // Trigger core booking, seat, and inventory cancellation cleanup
      await cancelBooking(updated.bookingId.toString(), adminNotes || 'Admin Refund Processed', session, BookingStatus.REFUNDED);

      // Update payment status to refunded
      await Payment.findByIdAndUpdate(
        updated.paymentId,
        { status: 'refunded' },
        { session }
      );

      // Asynchronous, exception-safe Full & Partial Refund Email Trigger
      try {
        const booking = await Booking.findById(updated.bookingId).populate('eventId').session(session || null);
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
            }).session(session || null);

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
            }).session(session || null);

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
            
            await Notification.create([{
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
            }], { session });

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: booking.guestEmail,
                subject,
                html: emailHtml,
                notificationType,
                bookingId: booking._id.toString(),
                eventId: event?._id?.toString() || booking.eventId.toString(),
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
          } else {
            logger.info({ bookingId: booking._id }, 'Refund email already queued or sent; skipping duplicate.');
          }
        }
      } catch (err) {
        logger.error({
          err,
          emailType: 'REFUND_PROCESSED',
          bookingId: updated.bookingId.toString(),
          timestamp: new Date().toISOString(),
          success: false
        }, 'Failed to queue refund email gracefully.');
      }
    }

    return updated;
  });
};
