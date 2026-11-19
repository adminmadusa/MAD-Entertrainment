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
  static async getTicketCountsByBookingIds(
    bookingIds: any[],
    batchSize = 100
  ): Promise<Map<string, number>> {
    const countMap = new Map<string, number>();
    if (!bookingIds || bookingIds.length === 0) {
      return countMap;
    }

    for (let i = 0; i < bookingIds.length; i += batchSize) {
      const batch = bookingIds.slice(i, i + batchSize);
      if (typeof Ticket.aggregate === 'function') {
        const results = await Ticket.aggregate([
          { $match: { bookingId: { $in: batch } } },
          { $group: { _id: '$bookingId', count: { $sum: 1 } } },
        ]);
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item._id) {
              countMap.set(item._id.toString(), item.count);
            }
          }
        } else if (typeof Ticket.countDocuments === 'function') {
          for (const id of batch) {
            const count = await Ticket.countDocuments({ bookingId: id });
            if (typeof count === 'number' && count > 0) {
              countMap.set(id.toString(), count);
            }
          }
        }
      } else {
        for (const id of batch) {
          const count = await Ticket.countDocuments({ bookingId: id });
          countMap.set(id.toString(), count);
        }
      }
    }

    return countMap;
  }

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

    if (candidates.length === 0) {
      return 0;
    }

    const candidateIds = candidates.map((candidate) => candidate._id);
    let ticketCounts: Map<string, number>;
    try {
      ticketCounts = await this.getTicketCountsByBookingIds(candidateIds);
    } catch (error) {
      logger.warn({ error }, 'watchdog: failed to batch query ticket counts, skipping repair cycle');
      return 0;
    }

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = ticketCounts.get(candidate._id.toString()) ?? 0;
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

    if (candidates.length === 0) {
      return 0;
    }

    const candidateIds = candidates.map((candidate) => candidate._id);
    let ticketCounts: Map<string, number>;
    try {
      ticketCounts = await this.getTicketCountsByBookingIds(candidateIds);
    } catch (error) {
      logger.error({ error }, 'watchdog: failed to batch count tickets, propagating diagnostic error');
      throw error;
    }

    let count = 0;
    for (const candidate of candidates) {
      const ticketCount = ticketCounts.get(candidate._id.toString()) ?? 0;
      if (ticketCount !== candidate.totalTickets) {
        count++;
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
