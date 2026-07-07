import { BookingStatus, NotificationType } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { fullRefundHtml, partialRefundHtml, eventCancellationHtml } from '../../lib/email';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Notification } from '../../models/notification.schema';
import { Refund } from '../../models/refund.schema';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';
import { createNotificationSafe } from '../notification.service';
import { QueueService } from '../queue.service';
import { UNTICKETED_BOOKING_WINDOW_MS } from './booking-consistency.service';

const STUCK_NOTIFICATION_THRESHOLD_MS = 15 * 60 * 1000;
const ORPHANED_DELIVERY_THRESHOLD_MS = 10 * 60 * 1000;

export class NotificationConsistencyService {
  static async repairStuckNotifications(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const stuckThreshold = new Date(Date.now() - STUCK_NOTIFICATION_THRESHOLD_MS);

    const candidates = await Notification.find({
      status: { $in: ['queued', 'processing'] },
      updatedAt: { $gte: windowStart, $lte: stuckThreshold },
    }).lean();

    let successCount = 0;
    for (const notification of candidates) {
      try {
        if (!notification.bookingId) {
          continue;
        }

        if (
          notification.type === NotificationType.FULL_REFUND ||
          notification.type === NotificationType.PARTIAL_REFUND
        ) {
          // ─── Refund Notifications ───
          // Recover independently of booking confirmation state.
          // Parse refund ID from jobId, e.g. refund-{refundId}-{timestamp}
          if (!notification.jobId || !notification.jobId.startsWith('refund-')) {
            continue;
          }
          const parts = notification.jobId.split('-');
          const refundId = parts[1];
          if (!refundId) {
            continue;
          }

          const refund = await Refund.findById(refundId);
          if (!refund || refund.status !== 'completed') {
            continue;
          }

          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking) {
            continue;
          }

          const event = await Event.findById(booking.eventId).lean();
          const totalAmount = booking.totalAmount;

          const completedRefunds = await Refund.find({
            paymentId: refund.paymentId,
            status: 'completed',
          }).lean();
          const totalRefunded = completedRefunds.reduce((sum, r) => sum + r.amount, 0);

          let emailHtml = '';
          let subject = '';

          if (notification.type === NotificationType.FULL_REFUND) {
            const formattedRefundDate = new Date(refund.processedAt || refund.updatedAt).toLocaleDateString('en-IN', {
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
          }

          // Transition state first to ensure single winner lease acquisition
          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            const newJobId = `refund-${refund._id}-retry`;
            await createNotificationSafe([{
              jobId: newJobId,
              status: 'queued',
              queuedAt: new Date(),
              type: notification.type,
              channel: 'email',
              recipient: booking.guestEmail,
              subject,
              isSent: false,
              retryCount: 0,
              bookingId: booking._id,
              eventId: event?._id,
            }]);

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: booking.guestEmail,
                subject,
                html: emailHtml,
                notificationType: notification.type,
                bookingId: booking._id.toString(),
                eventId: event?._id?.toString() || booking.eventId.toString(),
              },
              newJobId
            );
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck refund notification and enqueued email job.');
          }
        } else if (notification.type === NotificationType.EVENT_CANCELLED) {
          // ─── Cancellation Notifications ───
          // Recover independently of booking confirmation state.
          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking) {
            continue;
          }

          const event = await Event.findById(booking.eventId).lean();
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

          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            const newJobId = `cancellation-${booking.bookingId}-retry`;
            await createNotificationSafe([{
              jobId: newJobId,
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
              newJobId
            );
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck event cancellation notification.');
          }
        } else {
          // ─── Ticket / Other Notifications (Keep existing behavior) ───
          // Only recover if BOOKING_CONFIRMED (which is the default or explicit BOOKING_CONFIRMED type)
          if (notification.type && notification.type !== NotificationType.BOOKING_CONFIRMED) {
            continue;
          }

          const booking = await Booking.findById(notification.bookingId).lean();
          if (!booking || booking.status !== BookingStatus.CONFIRMED) {
            continue;
          }

          // Delivery Protection: Only process if tickets are fully generated
          const ticketCount = await Ticket.countDocuments({ bookingId: booking._id });
          if (ticketCount !== booking.totalTickets) {
            continue;
          }

          // 1. Attempt recovery enqueue FIRST
          await QueueService.enqueue(
            getQueueName('pdf-queue'),
            'pdf:generate',
            {
              bookingId: booking._id.toString(),
              eventId: booking.eventId.toString(),
              recipientEmail: booking.guestEmail,
              guestName: booking.guestName,
            },
            `pdf:generate:${booking._id}`
          );

          // 2. Only transition state if enqueue succeeds. Transition must be conditional.
          const updateResult = await Notification.updateOne(
            {
              _id: notification._id,
              status: { $in: ['queued', 'processing'] },
            },
            {
              $set: {
                status: 'failed',
                errorMessage: 'WATCHDOG_RESET_STUCK_LEASE',
              },
            }
          );

          if (updateResult.modifiedCount > 0) {
            successCount++;
            logger.info({ notificationId: notification._id, bookingId: booking._id }, 'Watchdog successfully reset stuck notification lease and re-enqueued PDF task.');
          } else {
            logger.warn({ notificationId: notification._id }, 'Watchdog: Stuck notification was updated concurrently, skipping lease reset.');
          }
        }
      } catch (error) {
        logger.warn({ notificationId: notification._id, error }, 'watchdog: failed to repair stuck notification');
      }
    }

    return successCount;
  }

  static async countStuckNotifications(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const stuckThreshold = new Date(Date.now() - STUCK_NOTIFICATION_THRESHOLD_MS);

    return await Notification.countDocuments({
      status: { $in: ['queued', 'processing'] },
      updatedAt: { $gte: windowStart, $lte: stuckThreshold },
    });
  }

  static async repairOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .sort({ updatedAt: 1 })
      .select('_id eventId guestEmail guestName totalTickets')
      .lean();

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          // Skip delivery since tickets are not fully generated yet
          continue;
        }

        const hasSentNotification = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });
        if (hasSentNotification) {
          continue;
        }

        // Final Sent-Notification Verification immediately before repair execution (race-condition check)
        const hasSentNotificationFinal = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });
        if (hasSentNotificationFinal) {
          logger.info({ bookingId: candidate._id }, 'Watchdog: Sent notification completed concurrently. Skipping repair.');
          continue;
        }

        await QueueService.enqueue(
          getQueueName('pdf-queue'),
          'pdf:generate',
          {
            bookingId: candidate._id.toString(),
            eventId: candidate.eventId.toString(),
            recipientEmail: candidate.guestEmail,
            guestName: candidate.guestName,
          },
          `pdf:generate:${candidate._id}`
        );

        successCount++;
        logger.info({ bookingId: candidate._id }, 'Watchdog successfully re-enqueued PDF generation for orphaned confirmed delivery.');
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to repair orphaned confirmed delivery');
      }
    }

    return successCount;
  }

  static async countOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .select('_id totalTickets')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          continue;
        }

        const hasSentNotification = await Notification.exists({
          bookingId: candidate._id,
          status: 'sent',
        });

        if (!hasSentNotification) {
          count++;
        }
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to count orphaned delivery candidate');
      }
    }
    return count;
  }
}
