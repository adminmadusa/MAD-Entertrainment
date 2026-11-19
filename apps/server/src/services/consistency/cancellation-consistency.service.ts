import { BookingStatus, NotificationType } from "@mad/shared";

import { getQueueName } from "../../config/queue.config";
import { eventCancellationHtml } from "../../lib/email";
import { Booking } from "../../models/booking.schema";
import { Event } from "../../models/event.schema";
import { Notification } from "../../models/notification.schema";
import { logger } from "../../utils/logger";
import { createNotificationSafe } from "../notification.service";
import { QueueService } from "../queue.service";

export interface CancellationRepairOptions {
  window?: "recent" | "durable" | "all";
  limit?: number;
}

export class CancellationConsistencyService {
  static async countOrphanedCancellationNotifications(): Promise<number> {
    const upper = new Date(Date.now() - 10 * 60 * 1000);
    const lower = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30d TTL boundary
    const cancelled = await Booking.find({
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
      cancelledAt: { $gte: lower, $lte: upper },
    })
      .select("_id")
      .lean();

    let count = 0;
    for (const booking of cancelled) {
      const hasNotification = await Notification.exists({
        bookingId: booking._id,
        type: NotificationType.EVENT_CANCELLED,
      });
      if (!hasNotification) count++;
    }
    return count;
  }

  static async repairOrphanedCancellationNotifications(
    options: CancellationRepairOptions = {},
  ): Promise<number> {
    const window = options.window || "recent";
    const limit = options.limit || 50;
    const now = Date.now();
    const upper = new Date(now - 10 * 60 * 1000);
    const windowStart48h = new Date(now - 48 * 60 * 60 * 1000);
    const ttlBoundary30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const matchQuery: any = {
      status: { $in: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] },
    };
    if (window === "durable")
      matchQuery.cancelledAt = { $gte: ttlBoundary30d, $lt: windowStart48h };
    else if (window === "all")
      matchQuery.cancelledAt = { $gte: ttlBoundary30d, $lte: upper };
    else matchQuery.cancelledAt = { $gte: windowStart48h, $lte: upper };

    let cancelledBookings: any[] = [];
    if (typeof Booking.aggregate === "function") {
      try {
        cancelledBookings = await Booking.aggregate([
          { $match: matchQuery },
          {
            $lookup: {
              from: "notifications",
              localField: "_id",
              foreignField: "bookingId",
              pipeline: [
                { $match: { type: NotificationType.EVENT_CANCELLED } },
              ],
              as: "cancellationNotifications",
            },
          },
          { $match: { "cancellationNotifications.0": { $exists: false } } },
          { $sort: { cancelledAt: 1, _id: 1 } },
          { $limit: limit },
        ]);
      } catch (aggErr) {
        logger.warn(
          { aggErr },
          "Cancellation aggregation lookup failed, falling back to find",
        );
      }
    }

    if (!cancelledBookings || cancelledBookings.length === 0) {
      cancelledBookings = await Booking.find(matchQuery)
        .sort({ cancelledAt: 1, _id: 1 })
        .limit(limit);
    }

    let recoveredCount = 0;
    for (const booking of cancelledBookings) {
      try {
        const hasNotification = await Notification.exists({
          bookingId: booking._id,
          type: NotificationType.EVENT_CANCELLED,
        });
        if (hasNotification) continue;

        const event = await Event.findById(booking.eventId);
        if (!event) continue;

        const formattedDate = new Date(
          event.startDate || booking.createdAt,
        ).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const emailBody = await eventCancellationHtml({
          customerName: booking.guestName,
          eventTitle: event.title || "MAD Event",
          eventDate: formattedDate,
          venueName: event.venue || "MAD Venue",
          bookingReference: booking.bookingId,
        });
        const jobId = `cancellation-${booking.bookingId}-retry`;

        await createNotificationSafe([
          {
            jobId,
            status: "queued",
            queuedAt: new Date(),
            type: NotificationType.EVENT_CANCELLED,
            channel: "email",
            recipient: booking.guestEmail,
            subject: `Event Cancelled: ${event.title || "MAD Event"}`,
            isSent: false,
            retryCount: 0,
            bookingId: booking._id,
            eventId: event._id,
          },
        ]);

        await QueueService.enqueue(
          getQueueName("notification-queue"),
          "email-dispatch",
          {
            to: booking.guestEmail,
            subject: `Event Cancelled: ${event.title || "MAD Event"}`,
            html: emailBody,
            notificationType: NotificationType.EVENT_CANCELLED,
            bookingId: booking._id.toString(),
            eventId: event._id.toString(),
          },
          jobId,
        );
        recoveredCount++;
        logger.info(
          { bookingId: booking._id },
          "Watchdog successfully recovered and enqueued orphaned cancellation notification.",
        );
      } catch (error) {
        logger.error(
          { bookingId: booking._id, error },
          "Watchdog: Failed to repair orphaned cancellation notification.",
        );
      }
    }
    return recoveredCount;
  }
}
