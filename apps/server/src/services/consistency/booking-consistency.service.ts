import { BookingStatus } from '@mad/shared';

import { getQueueName } from '../../config/queue.config';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';
import { expireBooking } from '../admin/booking.service';
import { QueueService } from '../queue.service';

export const UNTICKETED_BOOKING_WINDOW_MS = 48 * 60 * 60 * 1000;
const UNTICKETED_PAGE_SIZE = 25;

export class BookingConsistencyService {
  static async repairUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .sort({ updatedAt: 1 })
      .limit(UNTICKETED_PAGE_SIZE)
      .select('_id totalTickets')
      .lean();

    if (candidates.length === UNTICKETED_PAGE_SIZE) {
      logger.warn({ count: candidates.length }, 'Watchdog: UNTICKETED_PAGE_SIZE limit reached during confirmed bookings check');
    }

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount === candidate.totalTickets) {
          continue;
        }

        const bookingStillExists = await Booking.exists({ _id: candidate._id });
        if (!bookingStillExists) {
          logger.warn({ bookingId: candidate._id }, 'watchdog: booking no longer exists, skipping enqueue');
          continue;
        }

        await QueueService.enqueue(
          getQueueName('booking-queue'),
          'booking:confirm',
          { bookingId: candidate._id.toString() },
          `booking:confirm:${candidate._id}`
        );
        successCount++;
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to repair unticketed booking');
      }
    }

    return successCount;
  }

  static async countUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .select('_id totalTickets')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount !== candidate.totalTickets) {
          count++;
        }
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to count tickets for booking');
      }
    }
    return count;
  }

  static async expireStaleBookings(): Promise<number> {
    const now = new Date();

    // 1. Stuck-booking sweep (recovery for any crash/timeouts while in EXPIRING state)
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const recoveredStuck = await Booking.updateMany(
      { status: BookingStatus.EXPIRING, updatedAt: { $lte: stuckThreshold } },
      { $set: { status: BookingStatus.AWAITING_PAYMENT } }
    );
    if (recoveredStuck.modifiedCount > 0) {
      logger.warn({ count: recoveredStuck.modifiedCount }, 'Consistency: Recovered stuck EXPIRING bookings back to AWAITING_PAYMENT');
    }

    // 2. Fetch stale candidates
    const staleCandidates = await Booking.find({
      status: BookingStatus.AWAITING_PAYMENT,
      logicalExpiresAt: { $lte: now }
    }).select('_id').limit(100);

    let expiredCount = 0;
    for (const candidate of staleCandidates) {
      try {
        const expired = await expireBooking(candidate._id.toString(), 'booking-logical-checkout-timeout');
        if (expired) {
          expiredCount++;
        }
      } catch (err) {
        logger.error(
          { err, bookingId: candidate._id },
          'Consistency: Failed to process logical expiration for candidate'
        );
      }
    }
    return expiredCount;
  }
}
