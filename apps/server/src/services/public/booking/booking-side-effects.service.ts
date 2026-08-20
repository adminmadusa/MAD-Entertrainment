import { BookingStatus, NotificationType } from '@mad/shared';
import { getQueueName } from '../../../config/queue.config';
import { emitToAdmin, emitToEvent, emitToBooking } from '../../../config/socket';
import { eventCancellationHtml } from '../../../lib/email';
import { Notification } from '../../../models/notification.schema';
import { auditLog } from '../../../utils/audit';
import { logger } from '../../../utils/logger';
import { CacheService } from '../../cache.service';
import { createNotificationSafe } from '../../notification.service';
import { QueueService } from '../../queue.service';

export interface CancelBookingPostCommitPayload {
  bookingId: string;
  bookingRef: string;
  bookingStatus: string;
  bookingVersion: number;
  eventId: string;
  eventTitle: string;
  eventVenue: string;
  eventStartDate: Date | string | undefined;
  guestEmail: string;
  guestName: string;
  bookingCreatedAt: Date | string;
  reason: string;
  releasedSeatIds: string[];
  shouldSendCancellationEmail: boolean;
  actorId?: string;
}

export class BookingSideEffectsService {
  static async executeCancelBookingSideEffects(payload: CancelBookingPostCommitPayload) {
    const actions = [
      // 1. Cache Service Deletion
      async () => {
        await CacheService.delPattern('events:*');
      },
      // 2. Real-time updates via WebSockets (Seat unlocked)
      async () => {
        if (payload.releasedSeatIds && payload.releasedSeatIds.length > 0) {
          emitToEvent(
            payload.eventId,
            'seat:unlocked',
            { seatIds: payload.releasedSeatIds },
            payload.bookingRef
          );
        }
      },
      // 3. Emit update to Booking socket
      async () => {
        emitToBooking(
          payload.bookingId,
          'booking:updated',
          {
            bookingId: payload.bookingId,
            status: payload.bookingStatus,
            bookingVersion: payload.bookingVersion,
          },
          payload.bookingRef
        );
      },
      // 4. Emit update to Admin socket
      async () => {
        emitToAdmin(
          'bookings',
          'booking:updated',
          {
            bookingId: payload.bookingId,
            status: payload.bookingStatus,
            bookingVersion: payload.bookingVersion,
          },
          payload.bookingRef
        );
      },
      // 5. Audit Logging
      async () => {
        auditLog({
          action:
            payload.bookingStatus === BookingStatus.REFUNDED
              ? 'BOOKING_REFUNDED'
              : 'BOOKING_CANCELLED',
          actor: { type: 'admin', id: payload.actorId || 'system' },
          status: 'success',
          metadata: {
            bookingId: payload.bookingId,
            bookingReference: payload.bookingRef,
            eventId: payload.eventId,
            reason: payload.reason,
            releasedSeatIds: payload.releasedSeatIds,
          },
          description:
            payload.bookingStatus === BookingStatus.REFUNDED
              ? `Refunded booking ${payload.bookingRef} and released associated capacity/seats`
              : `Cancelled booking ${payload.bookingRef} and released associated capacity/seats`,
        });
      },
      // 6. Asynchronous, exception-safe Event Cancellation Email Trigger
      async () => {
        if (payload.shouldSendCancellationEmail) {
          const existingNotification = await Notification.findOne({
            type: NotificationType.EVENT_CANCELLED,
            bookingId: payload.bookingId,
          });

          if (!existingNotification) {
            const formattedDate = new Date(
              payload.eventStartDate || payload.bookingCreatedAt
            ).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            const emailBody = await eventCancellationHtml({
              customerName: payload.guestName,
              eventTitle: payload.eventTitle || 'MAD Event',
              eventDate: formattedDate,
              venueName: payload.eventVenue || 'MAD Venue',
              bookingReference: payload.bookingRef,
            });

            const jobId = `cancellation-${payload.bookingRef}-${Date.now()}`;

            await createNotificationSafe([
              {
                jobId,
                status: 'queued',
                queuedAt: new Date(),
                type: NotificationType.EVENT_CANCELLED,
                channel: 'email',
                recipient: payload.guestEmail,
                subject: `Event Cancelled: ${payload.eventTitle || 'MAD Event'}`,
                isSent: false,
                retryCount: 0,
                bookingId: payload.bookingId,
                eventId: payload.eventId,
              },
            ]);

            await QueueService.enqueue(
              getQueueName('notification-queue'),
              'email-dispatch',
              {
                to: payload.guestEmail,
                subject: `Event Cancelled: ${payload.eventTitle || 'MAD Event'}`,
                html: emailBody,
                notificationType: NotificationType.EVENT_CANCELLED,
                bookingId: payload.bookingId,
                eventId: payload.eventId,
              },
              jobId
            );

            logger.info(
              {
                emailType: 'EVENT_CANCELLED',
                recipient: payload.guestEmail,
                bookingId: payload.bookingId,
                eventId: payload.eventId,
                timestamp: new Date().toISOString(),
                success: true,
              },
              'Event cancellation email queued successfully.'
            );
          } else {
            logger.info(
              { bookingId: payload.bookingId },
              'Event cancellation email already queued or sent; skipping duplicate.'
            );
          }
        }
      },
    ];

    for (const action of actions) {
      try {
        await action();
      } catch (err: any) {
        logger.error({ err }, 'Error executing booking cancel post-commit side effect');
      }
    }
  }

  static async executeExpireBookingSideEffects(
    booking: any,
    releasedSeatIds: string[],
    wasAlreadyExpired?: boolean
  ) {
    if (wasAlreadyExpired) return;
    try {
      if (releasedSeatIds && releasedSeatIds.length > 0) {
        emitToEvent(
          booking.eventId.toString(),
          'seat:unlocked',
          { seatIds: releasedSeatIds },
          booking.bookingId
        );
      }

      emitToBooking(
        booking._id.toString(),
        'booking:updated',
        {
          bookingId: booking._id.toString(),
          status: booking.status,
          bookingVersion: booking.bookingVersion,
        },
        booking.bookingId
      );

      emitToAdmin(
        'bookings',
        'booking:updated',
        {
          bookingId: booking._id.toString(),
          status: booking.status,
          bookingVersion: booking.bookingVersion,
        },
        booking.bookingId
      );

      auditLog({
        action: 'BOOKING_EXPIRED',
        actor: { type: 'system', id: 'system' },
        status: 'success',
        metadata: {
          bookingId: booking._id.toString(),
          bookingReference: booking.bookingId,
          eventId: booking.eventId.toString(),
          releasedSeatIds,
        },
        description: `Expired booking ${booking.bookingId} due to payment timeout and released associated capacity/seats`,
      });
    } catch (err: any) {
      logger.error({ err }, 'Error executing booking expire post-commit side effects');
    }
  }
}
