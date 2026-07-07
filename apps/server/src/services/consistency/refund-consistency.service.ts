import { BookingStatus, NotificationType } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { fullRefundHtml, partialRefundHtml, eventCancellationHtml } from '../../lib/email';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Payment } from '../../models/payment.schema';
import { Refund } from '../../models/refund.schema';
import { logger } from '../../utils/logger';
import { auditLog } from '../../utils/audit';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { UNTICKETED_BOOKING_WINDOW_MS } from './booking-consistency.service';

export class RefundConsistencyService {
  static async countStuckProcessingRefunds(): Promise<number> {
    return await Refund.countDocuments({
      status: 'processing',
      updatedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) }
    });
  }

  static async countOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).select('_id bookingId').lean();

    let count = 0;
    for (const refund of completedRefunds) {
      const hasNotification = await Notification.exists({
        bookingId: refund.bookingId,
        jobId: { $regex: `^refund-${refund._id}` }
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  static async countOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).select('_id').lean();

    let count = 0;
    for (const booking of cancelledBookings) {
      const hasNotification = await Notification.exists({
        bookingId: booking._id,
        type: NotificationType.EVENT_CANCELLED
      });
      if (!hasNotification) {
        count++;
      }
    }
    return count;
  }

  static async repairStuckProcessingRefunds(): Promise<number> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
    const stuckRefunds = await Refund.find({
      status: 'processing',
      updatedAt: { $lte: threshold }
    }).limit(100);

    let resetCount = 0;
    for (const refund of stuckRefunds) {
      try {
        const updateResult = await Refund.updateOne(
          { _id: refund._id, status: 'processing' },
          { $set: { status: 'requested' } }
        );
        if (updateResult.modifiedCount > 0) {
          resetCount++;
          auditLog({
            action: 'REFUND_PROCESSING_TIMEOUT_RESET',
            actor: { type: 'admin', id: 'system' },
            status: 'success',
            metadata: {
              refundId: refund._id.toString(),
              paymentId: refund.paymentId.toString(),
              bookingId: refund.bookingId.toString(),
              amount: refund.amount,
            },
            description: `Reset stuck processing refund ${refund._id} back to requested due to 15-minute lease expiry.`,
          });
          logger.warn({ refundId: refund._id }, 'Watchdog: Reverted stuck processing refund back to requested status.');
        }
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to reset stuck processing refund.');
      }
    }
    return resetCount;
  }

  static async repairOrphanedRefundNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const completedRefunds = await Refund.find({
      status: 'completed',
      processedAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const refund of completedRefunds) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: refund.bookingId,
          jobId: { $regex: `^refund-${refund._id}` }
        });
        if (hasNotification) {
          continue;
        }

        const booking = await Booking.findById(refund.bookingId).populate('eventId');
        if (!booking || !booking.guestEmail) {
          continue;
        }

        const event = booking.eventId as any;
        const totalAmount = booking.totalAmount;

        const allCompleted = await Refund.find({
          paymentId: refund.paymentId,
          status: 'completed'
        });
        const totalRefunded = allCompleted.reduce((sum, r) => sum + r.amount, 0);
        const payment = await Payment.findById(refund.paymentId);
        const isFullRefund = payment ? totalRefunded === payment.amount : false;

        let emailHtml = '';
        let subject = '';
        let notificationType: NotificationType;

        if (isFullRefund) {
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
            refundAmount: refund.amount,
            refundDate: formattedRefundDate,
            settlementTimeline: '5-7 business days',
            currency: booking.currency || 'INR',
          });
          subject = `Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.FULL_REFUND;
        } else {
          emailHtml = await partialRefundHtml({
            customerName: booking.guestName,
            bookingReference: booking.bookingId,
            originalAmount: totalAmount,
            refundAmount: refund.amount,
            remainingAmount: Math.max(0, totalAmount - totalRefunded),
            reason: refund.reason || 'Tier adjustment refund',
            currency: booking.currency || 'INR',
          });
          subject = `Partial Refund Processed for ${booking.bookingId}`;
          notificationType = NotificationType.PARTIAL_REFUND;
        }

        const jobId = `refund-${refund._id}-retry`;

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

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject,
            html: emailHtml,
            notificationType,
            bookingId: booking._id.toString(),
            eventId: event?._id?.toString() || booking.eventId.toString() || '',
          },
          jobId
        );

        recoveredCount++;
        logger.info({ refundId: refund._id }, 'Watchdog successfully recovered and enqueued orphaned refund notification.');
      } catch (error) {
        logger.error({ refundId: refund._id, error }, 'Watchdog: Failed to repair orphaned refund notification.');
      }
    }
    return recoveredCount;
  }

  static async repairOrphanedCancellationNotifications(): Promise<number> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const cancelledBookings = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $lte: threshold }
    }).limit(50);

    let recoveredCount = 0;
    for (const booking of cancelledBookings) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: booking._id,
          type: NotificationType.EVENT_CANCELLED
        });
        if (hasNotification) {
          continue;
        }

        const event = await Event.findById(booking.eventId);
        if (!event) {
          continue;
        }

        const formattedDate = new Date(
          event.startDate || booking.createdAt
        ).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const emailBody = await eventCancellationHtml({
          customerName: booking.guestName,
          eventTitle: event.title || 'MAD Event',
          eventDate: formattedDate,
          venueName: event.venue || 'MAD Venue',
          bookingReference: booking.bookingId,
        });

        const jobId = `cancellation-${booking.bookingId}-retry`;

        await createNotificationSafe([{
          jobId,
          status: 'queued',
          queuedAt: new Date(),
          type: NotificationType.EVENT_CANCELLED,
          channel: 'email',
          recipient: booking.guestEmail,
          subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
          isSent: false,
          retryCount: 0,
          bookingId: booking._id,
          eventId: event._id,
        }]);

        await QueueService.enqueue(
          getQueueName('notification-queue'),
          'email-dispatch',
          {
            to: booking.guestEmail,
            subject: `Event Cancelled: ${event.title || 'MAD Event'}`,
            html: emailBody,
            notificationType: NotificationType.EVENT_CANCELLED,
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
          },
          jobId
        );

        recoveredCount++;
        logger.info({ bookingId: booking._id }, 'Watchdog successfully recovered and enqueued orphaned cancellation notification.');
      } catch (error) {
        logger.error({ bookingId: booking._id, error }, 'Watchdog: Failed to repair orphaned cancellation notification.');
      }
    }
    return recoveredCount;
  }
}
