"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationService = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const socket_1 = require("../config/socket");
const error_middleware_1 = require("../middleware/error.middleware");
const event_schema_1 = require("../models/event.schema");
const reservation_schema_1 = require("../models/reservation.schema");
const seat_layout_schema_1 = require("../models/seat-layout.schema");
const logger_1 = require("../utils/logger");
const inventory_state_service_1 = require("./inventory-state.service");
const ACTIVE_RESERVATION_STATUSES = [
    shared_1.ReservationStatus.RESERVED,
    shared_1.ReservationStatus.PENDING_PAYMENT,
    shared_1.ReservationStatus.CONFIRMED,
];
function safeEmit(label, emit, details) {
    try {
        emit();
    }
    catch (err) {
        logger_1.logger.debug({ err, ...details }, `Socket emit skipped: ${label}`);
    }
}
class ReservationService {
    static async reserveForBooking(request) {
        if (request.bookingMode === shared_1.BookingMode.SEAT_BASED) {
            return this.reserveSeats(request);
        }
        return this.reserveGeneralAdmission(request);
    }
    static async reserveGeneralAdmission(request) {
        const updatedEvent = await event_schema_1.Event.findOneAndUpdate({
            _id: request.eventId,
            $expr: { $lte: [{ $add: ['$soldCount', '$reservedCount', request.quantity] }, '$totalCapacity'] },
        }, { $inc: { reservedCount: request.quantity, eventVersion: 1 } }, { new: true });
        if (!updatedEvent) {
            throw error_middleware_1.AppError.badRequest('Requested quantity exceeds remaining event capacity');
        }
        const reservation = await reservation_schema_1.Reservation.create({
            eventId: request.eventId,
            tier: request.tier,
            section: request.tier,
            sessionId: request.sessionId,
            socketId: request.socketId,
            userId: request.userId ? new mongoose_1.Types.ObjectId(request.userId) : undefined,
            quantity: request.quantity,
            status: shared_1.ReservationStatus.RESERVED,
            inventoryState: shared_1.InventoryState.RESERVED,
            expiresAt: request.expiresAt,
            bookingId: request.bookingId,
            bookingReference: request.bookingReference,
            correlationId: request.correlationId,
            eventVersion: updatedEvent.eventVersion,
            transitionLog: [{ from: shared_1.InventoryState.AVAILABLE, to: shared_1.InventoryState.RESERVED, reason: 'booking-created', correlationId: request.correlationId }],
        });
        this.emitReservationChange(updatedEvent._id.toString(), [reservation], 'reservation:reserved');
        return [reservation];
    }
    static async reserveSeats(request) {
        const seats = request.seats ?? [];
        if (seats.length !== request.quantity) {
            throw error_middleware_1.AppError.badRequest('Seat reservation quantity must match selected seats');
        }
        const reservations = [];
        for (const seat of seats) {
            const reservation = new reservation_schema_1.Reservation({
                eventId: request.eventId,
                seatId: seat.seatId,
                section: seat.section,
                tier: request.tier,
                sessionId: request.sessionId,
                socketId: request.socketId,
                userId: request.userId ? new mongoose_1.Types.ObjectId(request.userId) : undefined,
                quantity: 1,
                status: shared_1.ReservationStatus.RESERVED,
                inventoryState: shared_1.InventoryState.RESERVED,
                expiresAt: request.expiresAt,
                bookingId: request.bookingId,
                bookingReference: request.bookingReference,
                correlationId: request.correlationId,
                transitionLog: [{ from: shared_1.InventoryState.AVAILABLE, to: shared_1.InventoryState.RESERVED, reason: 'booking-created', correlationId: request.correlationId }],
            });
            await reservation.save();
            reservations.push(reservation);
        }
        await event_schema_1.Event.findByIdAndUpdate(request.eventId, {
            $inc: { reservedCount: request.quantity, eventVersion: 1 },
        });
        this.emitReservationChange(request.eventId.toString(), reservations, 'reservation:reserved');
        return reservations;
    }
    static async transitionForBooking(bookingId, toStatus, details = {}) {
        const reservations = await reservation_schema_1.Reservation.find({ bookingId, status: { $in: ACTIVE_RESERVATION_STATUSES } });
        const transitioned = [];
        for (const reservation of reservations) {
            (0, inventory_state_service_1.assertReservationTransition)(reservation.status, toStatus, {
                reservationId: reservation.reservationId,
                bookingId: String(bookingId),
            });
            const previousStatus = reservation.status;
            reservation.status = toStatus;
            reservation.inventoryState = (0, inventory_state_service_1.reservationToInventoryState)(toStatus);
            reservation.paymentReference = details.paymentReference ?? reservation.paymentReference;
            reservation.paymentId = details.paymentId ?? reservation.paymentId;
            reservation.correlationId = details.correlationId ?? reservation.correlationId;
            reservation.reservationVersion += 1;
            reservation.transitionLog.push({
                from: previousStatus,
                to: toStatus,
                reason: details.reason,
                correlationId: details.correlationId,
                createdAt: new Date(),
            });
            await reservation.save();
            transitioned.push(reservation);
        }
        if (transitioned.length > 0) {
            const eventId = transitioned[0].eventId.toString();
            this.emitReservationChange(eventId, transitioned, `reservation:${toStatus}`);
        }
        return transitioned;
    }
    static async releaseCapacityForTerminalReservations(reservations) {
        const byEvent = new Map();
        for (const reservation of reservations) {
            const eventId = reservation.eventId.toString();
            byEvent.set(eventId, (byEvent.get(eventId) ?? 0) + reservation.quantity);
        }
        for (const [eventId, quantity] of byEvent.entries()) {
            await event_schema_1.Event.findByIdAndUpdate(eventId, {
                $inc: { reservedCount: -quantity, eventVersion: 1 },
            });
        }
    }
    static async confirmCapacity(reservations) {
        const byEvent = new Map();
        for (const reservation of reservations) {
            const eventId = reservation.eventId.toString();
            byEvent.set(eventId, (byEvent.get(eventId) ?? 0) + reservation.quantity);
        }
        for (const [eventId, quantity] of byEvent.entries()) {
            await event_schema_1.Event.findByIdAndUpdate(eventId, {
                $inc: { reservedCount: -quantity, eventVersion: 1 },
            });
        }
    }
    static async expireReservations(now = new Date()) {
        const stale = await reservation_schema_1.Reservation.find({
            status: { $in: [shared_1.ReservationStatus.RESERVED, shared_1.ReservationStatus.PENDING_PAYMENT] },
            expiresAt: { $lte: now },
        }).limit(500);
        const expired = [];
        for (const reservation of stale) {
            const previousStatus = reservation.status;
            reservation.status = shared_1.ReservationStatus.EXPIRED;
            reservation.inventoryState = shared_1.InventoryState.EXPIRED;
            reservation.reservationVersion += 1;
            reservation.transitionLog.push({ from: previousStatus, to: shared_1.ReservationStatus.EXPIRED, reason: 'reservation-expired', createdAt: new Date() });
            await reservation.save();
            expired.push(reservation);
        }
        if (expired.length > 0) {
            await this.releaseCapacityForTerminalReservations(expired);
            await this.releaseExpiredSeats(expired);
            for (const [eventId, reservations] of this.groupByEvent(expired).entries()) {
                this.emitReservationChange(eventId, reservations, 'reservation:expired');
            }
        }
        return expired;
    }
    static async releaseExpiredSeats(reservations) {
        const byEvent = this.groupByEvent(reservations.filter((reservation) => reservation.seatId));
        for (const [eventId, eventReservations] of byEvent.entries()) {
            const seatIds = eventReservations.map((reservation) => reservation.seatId).filter(Boolean);
            await seat_layout_schema_1.SeatLayout.updateOne({ eventId }, {
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
            }, { arrayFilters: [{ 'seat.seatId': { $in: seatIds }, 'seat.status': shared_1.SeatStatus.LOCKED }] });
        }
    }
    static groupByEvent(reservations) {
        const grouped = new Map();
        for (const reservation of reservations) {
            const eventId = reservation.eventId.toString();
            if (!grouped.has(eventId))
                grouped.set(eventId, []);
            grouped.get(eventId).push(reservation);
        }
        return grouped;
    }
    static emitReservationChange(eventId, reservations, eventName) {
        const payload = {
            eventId,
            reservationIds: reservations.map((reservation) => reservation.reservationId),
            seatIds: reservations.map((reservation) => reservation.seatId).filter(Boolean),
            version: Math.max(...reservations.map((reservation) => reservation.reservationVersion)),
            status: reservations[0]?.status,
        };
        safeEmit(eventName, () => (0, socket_1.emitToEvent)(eventId, eventName, payload), { eventId, eventName });
        safeEmit(eventName, () => (0, socket_1.emitToAdmin)('inventory', eventName, payload), { eventId, eventName });
    }
}
exports.ReservationService = ReservationService;
//# sourceMappingURL=reservation.service.js.map