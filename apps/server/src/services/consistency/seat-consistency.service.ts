import { BookingStatus, ReservationStatus, SeatStatus } from '@mad/shared';

import { getRedis, isRedisConnected } from '../../config/redis';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { SeatLayout } from '../../models/seat-layout.schema';
import { logger } from '../../utils/logger';

export class SeatConsistencyService {
  static async countRedisLocks(): Promise<number> {
    if (!isRedisConnected()) return 0;
    const redis = getRedis();
    let cursor = '0';
    let count = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== '0');
    return count;
  }

  static async cleanupPhantomRedisLocks(): Promise<number> {
    if (!isRedisConnected()) return 0;
    const redis = getRedis();
    let cursor = '0';
    let removed = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
      cursor = nextCursor;
      for (const key of keys) {
        const [, , , eventId, , seatId] = key.split(':');
        if (!eventId || !seatId) continue;
        const layout = await SeatLayout.findOne({ eventId, 'seats.seatId': seatId }).select({ seats: { $elemMatch: { seatId } } }).lean();
        const seat = layout?.seats.find((candidate) => candidate.seatId === seatId);
        if (!seat || seat.status !== SeatStatus.AVAILABLE) {
          await redis.del(key);
          removed++;
        }
      }
    } while (cursor !== '0');

    return removed;
  }

  static async repairStaleSeatReservations(): Promise<number> {
    const staleReservations = await Reservation.find({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    }).limit(500);

    let repaired = 0;
    for (const reservation of staleReservations) {
      const result = await SeatLayout.updateOne(
        { eventId: reservation.eventId },
          {
            $set: {
              'seats.$[seat].status': SeatStatus.AVAILABLE,
            },
            $unset: {
              'seats.$[seat].lockedBy': '',
              'seats.$[seat].lockedAt': '',
              'seats.$[seat].bookedByBookingId': '',
              'seats.$[seat].reservationId': '',
            },
            $inc: { 'seats.$[seat].seatVersion': 1 },
          },
        {
          arrayFilters: [
            {
              'seat.seatId': reservation.seatId,
              'seat.status': SeatStatus.LOCKED,
              'seat.reservationId': reservation.reservationId,
            },
          ],
        }
      );
      repaired += result.modifiedCount;
    }

    return repaired;
  }

  static async countEventInventoryMismatches(): Promise<number> {
    const events = await Event.find({}).select('_id soldCount reservedCount totalCapacity isSoldOut').lean();
    let mismatches = 0;

    for (const event of events) {
      const [confirmedBookings, activeReservations] = await Promise.all([
        Booking.aggregate([
          { $match: { eventId: event._id, status: BookingStatus.CONFIRMED } },
          { $group: { _id: null, total: { $sum: '$totalTickets' } } },
        ]),
        Reservation.aggregate([
          {
            $match: {
              eventId: event._id,
              status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] },
            },
          },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]),
      ]);

      const soldTotal = confirmedBookings[0]?.total ?? 0;
      const reservedTotal = activeReservations[0]?.total ?? 0;
      const shouldBeSoldOut = event.totalCapacity > 0 && soldTotal >= event.totalCapacity;
      if (
        event.soldCount !== soldTotal ||
        event.reservedCount !== reservedTotal ||
        event.isSoldOut !== shouldBeSoldOut
      ) {
        mismatches++;
      }
    }

    return mismatches;
  }

  static async repairEventInventoryMismatches(): Promise<number> {
    const events = await Event.find({}).select('_id soldCount reservedCount totalCapacity isSoldOut ticketTiers eventVersion');
    let repairedCount = 0;

    for (const event of events) {
      const [confirmedBookings, activeReservations] = await Promise.all([
        Booking.aggregate([
          { $match: { eventId: event._id, status: BookingStatus.CONFIRMED } },
          { $group: { _id: null, total: { $sum: '$totalTickets' } } },
        ]),
        Reservation.aggregate([
          {
            $match: {
              eventId: event._id,
              status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] },
            },
          },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]),
      ]);

      const soldTotal = confirmedBookings[0]?.total ?? 0;
      const reservedTotal = activeReservations[0]?.total ?? 0;
      const shouldBeSoldOut = event.totalCapacity > 0 && soldTotal >= event.totalCapacity;

      if (
        event.soldCount !== soldTotal ||
        event.reservedCount !== reservedTotal ||
        event.isSoldOut !== shouldBeSoldOut
      ) {
        // Also update individual tier soldCounts based on confirmed bookings
        const tierSoldCounts = new Map<string, number>();
        const confirmedBookingsDocs = await Booking.find({ eventId: event._id, status: BookingStatus.CONFIRMED }).lean();
        for (const bookingDoc of confirmedBookingsDocs) {
          if (!Array.isArray(bookingDoc.tickets)) {
            logger.warn(
              {
                bookingId: bookingDoc._id,
                bookingRef: bookingDoc.bookingId,
                ticketsType: typeof bookingDoc.tickets,
                ticketsValue: bookingDoc.tickets === null ? 'null' : 'non-array',
              },
              'Consistency: Booking has invalid tickets structure — skipping tier count. Document may be corrupted.'
            );
            continue;
          }
          for (const t of bookingDoc.tickets) {
            const tierConfig = event.ticketTiers.find((tc) => tc.tier === t.tier);
            const groupSize = tierConfig?.groupSize || 1;
            tierSoldCounts.set(t.tier, (tierSoldCounts.get(t.tier) ?? 0) + t.quantity * groupSize);
          }
        }

        const updatedTiers = event.ticketTiers.map(t => {
          const actualSold = tierSoldCounts.get(t.tier) ?? 0;
          t.soldCount = actualSold;
          return t;
        });

        const updateResult = await Event.updateOne(
          { _id: event._id, eventVersion: event.eventVersion },
          {
            $set: {
              soldCount: soldTotal,
              reservedCount: reservedTotal,
              isSoldOut: shouldBeSoldOut,
              ticketTiers: updatedTiers,
            },
            $inc: {
              eventVersion: 1
            }
          }
        );
        if (updateResult.modifiedCount > 0) {
          repairedCount++;
        } else {
          logger.warn(
            { eventId: event._id, currentVersion: event.eventVersion },
            'Consistency: Optimistic locking version conflict detected while repairing inventory mismatches. Skipping repair.'
          );
        }
      }
    }
    return repairedCount;
  }
}
