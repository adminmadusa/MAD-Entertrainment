import { NotificationType, RefundStatus } from '@mad/shared';

import { getQueueName } from '../../../config/queue.config';
import { fullRefundHtml, partialRefundHtml } from '../../../lib/email';
import { Booking } from '../../../models/booking.schema';
import { Notification } from '../../../models/notification.schema';
import { Payment } from '../../../models/payment.schema';
import { Refund, IRefund } from '../../../models/refund.schema';
import { logger } from '../../../utils/logger';
import { createNotificationSafe } from '../../notification.service';
import { QueueService } from '../../queue.service';

export class RefundNotificationService {
  /**
   * Post-commit async notification handler.
   * Renders appropriate refund emails, prevents duplicate dispatch, and enqueues to notification queue.
   */
  static async sendRefundNotification(updated: IRefund): Promise<void> {
    if (updated.status !== RefundStatus.COMPLETED || updated.reconciledAt) {
      return;
    }

    try {
      const booking = await Booking.findById(updated.bookingId).populate('eventId');
      if (!booking || !booking.guestEmail) {
        return;
      }

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
        // Full Refund: check duplicate
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
        // Partial Refund: check duplicate
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
}
