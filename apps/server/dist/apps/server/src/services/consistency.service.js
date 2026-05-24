"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsistencyService = void 0;
const shared_1 = require("@mad/shared");
const redis_1 = require("../config/redis");
const socket_1 = require("../config/socket");
const booking_schema_1 = require("../models/booking.schema");
const event_schema_1 = require("../models/event.schema");
const payment_schema_1 = require("../models/payment.schema");
const reservation_schema_1 = require("../models/reservation.schema");
const seat_layout_schema_1 = require("../models/seat-layout.schema");
const logger_1 = require("../utils/logger");
const reservation_service_1 = require("./reservation.service");
async function countRedisLocks() {
    if (!(0, redis_1.isRedisConnected)())
        return 0;
    const redis = (0, redis_1.getRedis)();
    let cursor = '0';
    let count = 0;
    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
        cursor = nextCursor;
        count += keys.length;
    } while (cursor !== '0');
    return count;
}
async function cleanupPhantomRedisLocks() {
    if (!(0, redis_1.isRedisConnected)())
        return 0;
    const redis = (0, redis_1.getRedis)();
    let cursor = '0';
    let removed = 0;
    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mad:lock:event:*:seat:*', 'COUNT', 250);
        cursor = nextCursor;
        for (const key of keys) {
            const [, , , eventId, , seatId] = key.split(':');
            if (!eventId || !seatId)
                continue;
            const layout = await seat_layout_schema_1.SeatLayout.findOne({ eventId, 'seats.seatId': seatId }).lean();
            const seat = layout?.seats.find((candidate) => candidate.seatId === seatId);
            if (!seat || seat.status !== shared_1.SeatStatus.AVAILABLE) {
                await redis.del(key);
                removed++;
            }
        }
    } while (cursor !== '0');
    return removed;
}
async function repairStaleSeatReservations() {
    const staleReservations = await reservation_schema_1.Reservation.find({
        status: { $in: [shared_1.ReservationStatus.EXPIRED, shared_1.ReservationStatus.FAILED, shared_1.ReservationStatus.CANCELLED] },
        seatId: { $exists: true },
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).limit(500);
    let repaired = 0;
    for (const reservation of staleReservations) {
        const result = await seat_layout_schema_1.SeatLayout.updateOne({ eventId: reservation.eventId }, {
            $set: {
                'seats.$[seat].status': shared_1.SeatStatus.AVAILABLE,
            },
            $unset: {
                'seats.$[seat].lockedBy': '',
                'seats.$[seat].lockedAt': '',
                'seats.$[seat].bookedByBookingId': '',
                'seats.$[seat].reservationId': '',
            },
            $inc: { 'seats.$[seat].seatVersion': 1 },
        }, {
            arrayFilters: [
                {
                    'seat.seatId': reservation.seatId,
                    'seat.status': shared_1.SeatStatus.LOCKED,
                    'seat.reservationId': reservation.reservationId,
                },
            ],
        });
        repaired += result.modifiedCount;
    }
    return repaired;
}
async function countEventInventoryMismatches() {
    const events = await event_schema_1.Event.find({}).select('_id soldCount reservedCount').lean();
    let mismatches = 0;
    for (const event of events) {
        const [confirmedBookings, activeReservations] = await Promise.all([
            booking_schema_1.Booking.aggregate([
                { $match: { eventId: event._id, status: shared_1.BookingStatus.CONFIRMED } },
                { $group: { _id: null, total: { $sum: '$totalTickets' } } },
            ]),
            reservation_schema_1.Reservation.aggregate([
                {
                    $match: {
                        eventId: event._id,
                        status: { $in: [shared_1.ReservationStatus.RESERVED, shared_1.ReservationStatus.PENDING_PAYMENT] },
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
class ConsistencyService {
    static async runRepairCycle() {
        const [expiredReservations, phantomRedisLocks, staleSeatReservations] = await Promise.all([
            reservation_service_1.ReservationService.expireReservations(),
            cleanupPhantomRedisLocks(),
            repairStaleSeatReservations(),
        ]);
        const report = await this.generateReport();
        report.repairs = {
            expiredReservations: expiredReservations.length,
            phantomRedisLocks,
            staleSeatReservations,
        };
        if (expiredReservations.length > 0 || phantomRedisLocks > 0 || staleSeatReservations > 0) {
            logger_1.logger.warn({ report }, 'Consistency repair cycle completed with repairs');
            (0, socket_1.emitToAdmin)('inventory', 'consistency:repaired', report);
            for (const [eventId, reservations] of reservation_service_1.ReservationService.groupByEvent(expiredReservations).entries()) {
                (0, socket_1.emitToEvent)(eventId, 'inventory:sync-required', {
                    eventId,
                    reservationIds: reservations.map((reservation) => reservation.reservationId),
                });
            }
        }
        return report;
    }
    static async generateReport() {
        const now = new Date();
        const [activeReservations, expiredReservations, redisLocks, awaitingPaymentBookings, orphanPayments, eventInventoryMismatches,] = await Promise.all([
            reservation_schema_1.Reservation.countDocuments({ status: { $in: [shared_1.ReservationStatus.RESERVED, shared_1.ReservationStatus.PENDING_PAYMENT] } }),
            reservation_schema_1.Reservation.countDocuments({ status: { $in: [shared_1.ReservationStatus.RESERVED, shared_1.ReservationStatus.PENDING_PAYMENT] }, expiresAt: { $lte: now } }),
            countRedisLocks(),
            booking_schema_1.Booking.countDocuments({ status: shared_1.BookingStatus.AWAITING_PAYMENT }),
            payment_schema_1.Payment.countDocuments({ status: shared_1.PaymentStatus.PENDING, bookingId: { $exists: false } }),
            countEventInventoryMismatches(),
        ]);
        const staleSeatReservations = await reservation_schema_1.Reservation.countDocuments({
            status: { $in: [shared_1.ReservationStatus.EXPIRED, shared_1.ReservationStatus.FAILED, shared_1.ReservationStatus.CANCELLED] },
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
exports.ConsistencyService = ConsistencyService;
//# sourceMappingURL=consistency.service.js.map