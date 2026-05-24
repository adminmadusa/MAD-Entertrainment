import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus } from '@mad/shared';

import { getRedis, isRedisConnected } from '../config/redis';
import { emitToAdmin, emitToEvent } from '../config/socket';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Payment } from '../models/payment.schema';
import { Reservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { logger } from '../utils/logger';
import { runWithContext } from '../utils/context';
import { auditLog } from '../utils/audit';
import crypto from 'crypto';

import { ReservationService } from './reservation.service';

export interface ConsistencyReport {
  generatedAt: string;
  counts: {
    activeReservations: number;
    expiredReservations: number;
    redisLocks: number;
    awaitingPaymentBookings: number;
    orphanPayments: number;
  };
  drift: {
    staleSeatReservations: number;
    phantomRedisLocks: number;
    eventInventoryMismatches: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
    eventInventoryMismatchesRepaired?: number;
  };
}

async function countRedisLocks(): Promise<number> {
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

async function cleanupPhantomRedisLocks(): Promise<number> {
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

async function repairStaleSeatReservations(): Promise<number> {
  const staleReservations = await Reservation.find({
    status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
    seatId: { $exists: true },
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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

async function countEventInventoryMismatches(): Promise<number> {
  const events = await Event.find({}).select('_id soldCount reservedCount').lean();
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
    if (event.soldCount !== soldTotal || event.reservedCount !== reservedTotal) {
      mismatches++;
    }
  }

  return mismatches;
}

async function repairEventInventoryMismatches(): Promise<number> {
  const events = await Event.find({}).select('_id soldCount reservedCount ticketTiers eventVersion');
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

    if (event.soldCount !== soldTotal || event.reservedCount !== reservedTotal) {
      // Also update individual tier soldCounts based on confirmed bookings
      const tierSoldCounts = new Map<string, number>();
      const confirmedBookingsDocs = await Booking.find({ eventId: event._id, status: BookingStatus.CONFIRMED }).lean();
      for (const bookingDoc of confirmedBookingsDocs) {
        for (const t of bookingDoc.tickets) {
          tierSoldCounts.set(t.tier, (tierSoldCounts.get(t.tier) ?? 0) + t.quantity);
        }
      }

      const updatedTiers = event.ticketTiers.map(t => {
        const actualSold = tierSoldCounts.get(t.tier) ?? 0;
        t.soldCount = actualSold;
        return t;
      });

      await Event.updateOne(
        { _id: event._id },
        { 
          $set: { 
            soldCount: soldTotal, 
            reservedCount: reservedTotal, 
            ticketTiers: updatedTiers,
            eventVersion: event.eventVersion + 1 
          } 
        }
      );
      repairedCount++;
    }
  }
  return repairedCount;
}

export class ConsistencyService {
  static async runRepairCycle(): Promise<ConsistencyReport> {
    const correlationId = `repair-cycle-${crypto.randomUUID().slice(0, 8)}`;
    return runWithContext({ correlationId }, async () => {
      const startTime = Date.now();
      const [expiredReservations, phantomRedisLocks, staleSeatReservations, eventInventoryMismatchesRepaired] = await Promise.all([
        ReservationService.expireReservations(),
        cleanupPhantomRedisLocks(),
        repairStaleSeatReservations(),
        repairEventInventoryMismatches(),
      ]);

      const report = await this.generateReport();
      report.repairs = {
        expiredReservations: expiredReservations.length,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
      };

      const durationMs = Date.now() - startTime;

      auditLog({
        action: 'CONSISTENCY_REPAIR_CYCLE',
        status: 'success',
        metadata: {
          durationMs,
          repairs: report.repairs,
          drift: report.drift,
          counts: report.counts,
        },
        description: `Consistency repair cycle finished in ${durationMs}ms with ${expiredReservations.length} expired reservations, ${phantomRedisLocks} phantom locks, ${staleSeatReservations} stale seats, and ${eventInventoryMismatchesRepaired} inventory mismatches repaired.`,
      });

      if (expiredReservations.length > 0 || phantomRedisLocks > 0 || staleSeatReservations > 0 || eventInventoryMismatchesRepaired > 0) {
        logger.warn({ report }, 'Consistency repair cycle completed with repairs');
        emitToAdmin('inventory', 'consistency:repaired', report);
        for (const [eventId, reservations] of ReservationService.groupByEvent(expiredReservations).entries()) {
          emitToEvent(eventId, 'inventory:sync-required', {
            eventId,
            reservationIds: reservations.map((reservation) => reservation.reservationId),
          });
        }
      }

      return report;
    });
  }

  static async generateReport(): Promise<ConsistencyReport> {
    const now = new Date();
    const [
      activeReservations,
      expiredReservations,
      redisLocks,
      awaitingPaymentBookings,
      orphanPayments,
      eventInventoryMismatches,
    ] = await Promise.all([
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] } }),
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }, expiresAt: { $lte: now } }),
      countRedisLocks(),
      Booking.countDocuments({ status: BookingStatus.AWAITING_PAYMENT }),
      Payment.countDocuments({ status: PaymentStatus.PENDING, bookingId: { $exists: false } }),
      countEventInventoryMismatches(),
    ]);

    const staleSeatReservations = await Reservation.countDocuments({
      status: { $in: [ReservationStatus.EXPIRED, ReservationStatus.FAILED, ReservationStatus.CANCELLED] },
      seatId: { $exists: true },
    });

    return {
      generatedAt: now.toISOString(),
      counts: {
        activeReservations,
        expiredReservations,
        redisLocks,
        awaitingPaymentBookings,
        orphanPayments,
      },
      drift: {
        staleSeatReservations,
        phantomRedisLocks: 0,
        eventInventoryMismatches,
      },
    };
  }
}
