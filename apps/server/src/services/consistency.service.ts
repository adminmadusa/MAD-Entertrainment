import { BookingStatus, PaymentStatus, ReservationStatus, SeatStatus, NotificationType } from '@mad/shared';

import { getRedis, isRedisConnected } from '../config/redis';
import { emitToAdmin, emitToEvent } from '../config/socket';
import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Payment } from '../models/payment.schema';
import { Reservation } from '../models/reservation.schema';
import { SeatLayout } from '../models/seat-layout.schema';
import { Notification } from '../models/notification.schema';
import { logger } from '../utils/logger';
import { runWithContext, getTraceContext } from '../utils/context';
import { auditLog } from '../utils/audit';
import crypto from 'crypto';

import { ReservationService } from './reservation.service';
import { Ticket } from '../models/ticket.schema';
import { QueueService } from './queue.service';
import { getQueueName } from '../config/queue.config';

const UNTICKETED_BOOKING_WINDOW_MS = 48 * 60 * 60 * 1000;
const UNTICKETED_PAGE_SIZE = 25;
const STUCK_NOTIFICATION_THRESHOLD_MS = 15 * 60 * 1000;
const ORPHANED_DELIVERY_THRESHOLD_MS = 10 * 60 * 1000;

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
    unticketedConfirmedBookings: number;
    stuckNotifications: number;
    orphanedConfirmedDeliveries: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
    eventInventoryMismatchesRepaired?: number;
    logicallyExpiredBookings?: number;
    reEnqueuedUnticketedBookings?: number;
    resetStuckNotifications?: number;
    reEnqueuedOrphanedDeliveries?: number;
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
  private static async repairUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .sort({ updatedAt: 1 })
      .limit(UNTICKETED_PAGE_SIZE)
      .select('_id')
      .lean();

    if (candidates.length === UNTICKETED_PAGE_SIZE) {
      logger.warn({ count: candidates.length }, 'Watchdog: UNTICKETED_PAGE_SIZE limit reached during confirmed bookings check');
    }

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount > 0) {
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

  private static async countUnticketedConfirmedBookings(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart },
    })
      .select('_id')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount === 0) {
          count++;
        }
      } catch (error) {
        logger.warn({ bookingId: candidate._id, error }, 'watchdog: failed to count tickets for booking');
      }
    }
    return count;
  }

  private static async repairStuckNotifications(): Promise<number> {
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

        const booking = await Booking.findById(notification.bookingId).lean();
        if (!booking || booking.status !== BookingStatus.CONFIRMED) {
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
      } catch (error) {
        logger.warn({ notificationId: notification._id, error }, 'watchdog: failed to repair stuck notification');
      }
    }

    return successCount;
  }

  private static async countStuckNotifications(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const stuckThreshold = new Date(Date.now() - STUCK_NOTIFICATION_THRESHOLD_MS);

    return await Notification.countDocuments({
      status: { $in: ['queued', 'processing'] },
      updatedAt: { $gte: windowStart, $lte: stuckThreshold },
    });
  }

  private static async repairOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .sort({ updatedAt: 1 })
      .select('_id eventId guestEmail guestName')
      .lean();

    let successCount = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount === 0) {
          // Handled by repairUnticketedConfirmedBookings
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

  private static async countOrphanedConfirmedDeliveries(): Promise<number> {
    const windowStart = new Date(Date.now() - UNTICKETED_BOOKING_WINDOW_MS);
    const orphanedThreshold = new Date(Date.now() - ORPHANED_DELIVERY_THRESHOLD_MS);

    const candidates = await Booking.find({
      status: BookingStatus.CONFIRMED,
      updatedAt: { $gte: windowStart, $lte: orphanedThreshold },
    })
      .select('_id')
      .lean();

    let count = 0;
    for (const candidate of candidates) {
      try {
        const ticketCount = await Ticket.countDocuments({ bookingId: candidate._id });
        if (ticketCount === 0) {
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
      // 3. Atomically claim the booking by transitioning status to EXPIRING
      const booking = await Booking.findOneAndUpdate(
        { _id: candidate._id, status: BookingStatus.AWAITING_PAYMENT },
        { $set: { status: BookingStatus.EXPIRING }, $inc: { bookingVersion: 1 } },
        { new: true }
      );

      if (!booking) {
        // Already claimed by another worker/thread, skip
        continue;
      }

      try {
        // 4. Process logical expiration and release inventory
        const failedReservations = await ReservationService.transitionForBooking(booking._id, ReservationStatus.FAILED, {
          reason: 'booking-logical-checkout-timeout',
          correlationId: booking.bookingId,
        });
        await ReservationService.releaseCapacityForTerminalReservations(failedReservations);

        const event = await Event.findById(booking.eventId);
        if (event && event.bookingMode === 'seat_based') {
          const allSeatIds = booking.tickets.flatMap((ticket) => ticket.seats || []).map((seat) => seat.seatId);
          if (allSeatIds.length > 0) {
            await SeatLayout.updateOne(
              { eventId: event._id },
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
                $inc: {
                  'seats.$[seat].seatVersion': 1,
                },
              },
              {
                arrayFilters: [
                  {
                    'seat.seatId': { $in: allSeatIds },
                    'seat.status': SeatStatus.LOCKED,
                    'seat.bookedByBookingId': booking._id.toString(),
                  },
                ],
              }
            );
          }
        }

        // 5. Transition from EXPIRING to EXPIRED atomically
        const finalized = await Booking.updateOne(
          { _id: booking._id, status: BookingStatus.EXPIRING },
          { $set: { status: BookingStatus.EXPIRED } }
        );

        if (finalized.modifiedCount > 0) {
          expiredCount++;
          logger.info({ bookingId: booking._id, bookingReference: booking.bookingId }, 'Consistency: Logically expired booking and released held inventory');
        }
      } catch (err) {
        logger.error(
          { err, bookingId: booking._id, bookingReference: booking.bookingId },
          'Consistency: Failed to process logical expiration for candidate'
        );
      }
    }
    return expiredCount;
  }

  static async runRepairCycle(): Promise<ConsistencyReport> {
    const correlationId = `repair-cycle-${crypto.randomUUID().slice(0, 8)}`;
    return runWithContext({ correlationId }, async () => {
      const startTime = Date.now();
      const [
        expiredReservations,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
      ] = await Promise.all([
        ReservationService.expireReservations(),
        cleanupPhantomRedisLocks(),
        repairStaleSeatReservations(),
        repairEventInventoryMismatches(),
        ConsistencyService.expireStaleBookings(),
        ConsistencyService.repairUnticketedConfirmedBookings(),
        ConsistencyService.repairStuckNotifications(),
        ConsistencyService.repairOrphanedConfirmedDeliveries(),
      ]);

      const report = await this.generateReport();
      report.repairs = {
        expiredReservations: expiredReservations.length,
        phantomRedisLocks,
        staleSeatReservations,
        eventInventoryMismatchesRepaired,
        logicallyExpiredBookings,
        reEnqueuedUnticketedBookings,
        resetStuckNotifications,
        reEnqueuedOrphanedDeliveries,
      };

      const durationMs = Date.now() - startTime;

      const hasRepairs = expiredReservations.length > 0 ||
        phantomRedisLocks > 0 ||
        staleSeatReservations > 0 ||
        eventInventoryMismatchesRepaired > 0 ||
        logicallyExpiredBookings > 0 ||
        reEnqueuedUnticketedBookings > 0 ||
        resetStuckNotifications > 0 ||
        reEnqueuedOrphanedDeliveries > 0;

      const context = getTraceContext();
      const isManual = !!(context?.userId || context?.sessionId);

      if (hasRepairs || isManual) {
        auditLog({
          action: 'CONSISTENCY_REPAIR_CYCLE',
          status: 'success',
          metadata: {
            durationMs,
            repairs: report.repairs,
            drift: report.drift,
            counts: report.counts,
          },
          description: `Consistency repair cycle finished in ${durationMs}ms with ${expiredReservations.length} expired reservations, ${phantomRedisLocks} phantom locks, ${staleSeatReservations} stale seats, ${eventInventoryMismatchesRepaired} inventory mismatches, ${resetStuckNotifications} stuck notifications, and ${reEnqueuedOrphanedDeliveries} orphaned deliveries repaired.`,
        });
      }

      if (hasRepairs) {
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
      unticketedConfirmedBookings,
      stuckNotifications,
      orphanedConfirmedDeliveries,
    ] = await Promise.all([
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] } }),
      Reservation.countDocuments({ status: { $in: [ReservationStatus.RESERVED, ReservationStatus.PENDING_PAYMENT] }, expiresAt: { $lte: now } }),
      countRedisLocks(),
      Booking.countDocuments({ status: BookingStatus.AWAITING_PAYMENT }),
      Payment.countDocuments({ status: PaymentStatus.PENDING, bookingId: { $exists: false } }),
      countEventInventoryMismatches(),
      ConsistencyService.countUnticketedConfirmedBookings(),
      ConsistencyService.countStuckNotifications(),
      ConsistencyService.countOrphanedConfirmedDeliveries(),
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
        unticketedConfirmedBookings,
        stuckNotifications,
        orphanedConfirmedDeliveries,
      },
    };
  }
}
