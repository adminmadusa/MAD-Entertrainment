"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBookingService = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const socket_1 = require("../../config/socket");
const redis_1 = require("../../config/redis");
const error_middleware_1 = require("../../middleware/error.middleware");
const booking_schema_1 = require("../../models/booking.schema");
const coupon_schema_1 = require("../../models/coupon.schema");
const event_schema_1 = require("../../models/event.schema");
const seat_layout_schema_1 = require("../../models/seat-layout.schema");
const logger_1 = require("../../utils/logger");
const reservation_service_1 = require("../reservation.service");
class PublicBookingService {
    static async createBooking(data, sessionId, userId) {
        const event = await event_schema_1.Event.findById(data.eventId);
        if (!event || event.status !== 'published') {
            throw error_middleware_1.AppError.notFound('Event not found or not published');
        }
        if (event.isSoldOut) {
            throw error_middleware_1.AppError.badRequest('Event is sold out');
        }
        let subtotal = 0;
        let totalTicketsCount = 0;
        let totalGst = 0;
        const finalTickets = [];
        // Validate Tiers and Quantities
        for (const ticketReq of data.tickets) {
            const tierConfig = event.ticketTiers.find((t) => t.tier === ticketReq.tier && t.isActive);
            if (!tierConfig) {
                throw error_middleware_1.AppError.badRequest(`Ticket tier "${ticketReq.tier}" is invalid or inactive`);
            }
            // Check availability window
            if (tierConfig.availabilityWindow?.startDate && tierConfig.availabilityWindow?.endDate) {
                const now = new Date();
                if (now < new Date(tierConfig.availabilityWindow.startDate) || now > new Date(tierConfig.availabilityWindow.endDate)) {
                    throw error_middleware_1.AppError.badRequest(`Ticket tier "${tierConfig.name}" is not currently available for purchase`);
                }
            }
            // Check min per booking
            if (tierConfig.minPerBooking && ticketReq.quantity < tierConfig.minPerBooking) {
                throw error_middleware_1.AppError.badRequest(`Minimum ${tierConfig.minPerBooking} tickets required for tier "${tierConfig.name}"`);
            }
            // Check max per booking
            if (tierConfig.maxPerBooking && ticketReq.quantity > tierConfig.maxPerBooking) {
                throw error_middleware_1.AppError.badRequest(`Maximum ${tierConfig.maxPerBooking} tickets allowed for tier "${tierConfig.name}"`);
            }
            // Check tier capacity based on group size (1 package of Friends Pack consumes 4 capacity)
            const groupSize = tierConfig.groupSize || 1;
            const capacityConsumed = ticketReq.quantity * groupSize;
            if (tierConfig.soldCount + capacityConsumed > tierConfig.totalCapacity) {
                throw error_middleware_1.AppError.badRequest(`Requested quantity for tier "${tierConfig.name}" exceeds remaining capacity`);
            }
            // Subtotal after tier discount
            const tierPriceAfterDiscount = Math.max(0, tierConfig.price - (tierConfig.discount || 0));
            const tierSubtotal = tierPriceAfterDiscount * ticketReq.quantity;
            // Calculate Tier-specific GST
            const tierTaxPercent = tierConfig.taxPercent ?? 18;
            const tierGst = Math.round((tierSubtotal * tierTaxPercent) / 100);
            subtotal += tierSubtotal;
            totalGst += tierGst;
            totalTicketsCount += ticketReq.quantity; // We count actual packages/tickets bought for convenience fee
            finalTickets.push({
                tier: ticketReq.tier,
                tierName: tierConfig.name,
                quantity: ticketReq.quantity,
                pricePerTicket: tierConfig.price,
                subtotal: tierSubtotal,
                seats: ticketReq.seats || [],
            });
        }
        if (totalTicketsCount <= 0) {
            throw error_middleware_1.AppError.badRequest('Must book at least 1 ticket');
        }
        // Seat lock validation (for seat-based events)
        if (event.bookingMode === shared_1.BookingMode.SEAT_BASED) {
            const allSeatReqs = data.tickets.flatMap((t) => t.seats || []);
            if (allSeatReqs.length !== totalTicketsCount) {
                throw error_middleware_1.AppError.badRequest('Seat selection is required and must match total tickets count for seat-based events');
            }
            const redis = (0, redis_1.getRedis)();
            const seatLayout = await seat_layout_schema_1.SeatLayout.findOne({ eventId: event._id });
            if (!seatLayout) {
                throw error_middleware_1.AppError.badRequest('Seat layout configuration missing for this event');
            }
            // Verify each seat is available in DB and locked by this session in Redis
            for (const seatReq of allSeatReqs) {
                const dbSeat = seatLayout.seats.find((s) => s.seatId === seatReq.seatId);
                if (!dbSeat) {
                    throw error_middleware_1.AppError.badRequest(`Seat ID "${seatReq.seatId}" does not exist in event layout`);
                }
                if (dbSeat.status !== shared_1.SeatStatus.AVAILABLE) {
                    throw error_middleware_1.AppError.badRequest(`Seat ID "${seatReq.seatId}" is no longer available`);
                }
                // Verify Redis lock
                const redisLockVal = await redis.get(`mad:lock:event:${event._id}:seat:${seatReq.seatId}`);
                if (!redisLockVal || redisLockVal !== sessionId) {
                    throw error_middleware_1.AppError.badRequest(`Seat ID "${seatReq.seatId}" is not locked by your session. Please lock seats again.`);
                }
            }
        }
        // Pricing calculations (₹30 per ticket convenience fee, 18% GST on convenience fee + subtotal GST)
        const convenienceFee = 30 * totalTicketsCount;
        const convenienceFeeGst = Math.round((convenienceFee * 18) / 100);
        const gst = totalGst + convenienceFeeGst;
        // Apply Coupon
        let discount = 0;
        let couponId;
        if (data.couponCode) {
            const coupon = await coupon_schema_1.Coupon.findOne({ code: data.couponCode.toUpperCase() });
            if (!coupon || !coupon.isActive) {
                throw error_middleware_1.AppError.badRequest('Coupon is invalid or inactive');
            }
            const now = new Date();
            if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
                throw error_middleware_1.AppError.badRequest('Coupon validity has expired');
            }
            if (coupon.usedCount >= coupon.usageLimit) {
                throw error_middleware_1.AppError.badRequest('Coupon usage limit reached');
            }
            if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
                throw error_middleware_1.AppError.badRequest(`Minimum subtotal order amount of ₹${coupon.minOrderAmount} is required for this coupon`);
            }
            // Scope checks
            if (coupon.applicableEventIds && coupon.applicableEventIds.length > 0) {
                const hasEvent = coupon.applicableEventIds.some((id) => id.toString() === event._id.toString());
                if (!hasEvent) {
                    throw error_middleware_1.AppError.badRequest('Coupon is not applicable to this event');
                }
            }
            if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
                if (!coupon.applicableCategories.includes(event.category)) {
                    throw error_middleware_1.AppError.badRequest('Coupon is not applicable to this category of events');
                }
            }
            if (coupon.discountType === 'percentage') {
                discount = Math.round((subtotal * coupon.discountValue) / 100);
                if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                    discount = coupon.maxDiscount;
                }
            }
            else {
                discount = coupon.discountValue;
            }
            if (discount > subtotal) {
                discount = subtotal; // discount can't exceed subtotal ticket cost
            }
            couponId = coupon._id;
        }
        const totalAmount = Math.max(0, subtotal + convenienceFee + gst - discount);
        // Expiry in 10 minutes (matching the TTL index on expiresAt)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        // Create pending booking
        const booking = new booking_schema_1.Booking({
            eventId: event._id,
            userId: userId ? new mongoose_1.Types.ObjectId(userId) : undefined,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestPhone: data.guestPhone,
            tickets: finalTickets,
            totalTickets: totalTicketsCount,
            subtotal,
            convenienceFee,
            gst,
            discount,
            totalAmount,
            currency: 'INR', // Default local currency
            couponCode: data.couponCode ? data.couponCode.toUpperCase() : undefined,
            couponId,
            status: shared_1.BookingStatus.AWAITING_PAYMENT,
            expiresAt,
        });
        await booking.save();
        let reservations = [];
        try {
            for (const ticketReq of data.tickets) {
                const allocated = await reservation_service_1.ReservationService.reserveForBooking({
                    eventId: event._id,
                    bookingMode: event.bookingMode,
                    tier: ticketReq.tier,
                    quantity: ticketReq.quantity,
                    seats: ticketReq.seats?.map((seat) => ({ seatId: seat.seatId, section: seat.section })),
                    sessionId,
                    userId,
                    bookingId: booking._id,
                    bookingReference: booking.bookingId,
                    correlationId: booking.bookingId,
                    expiresAt,
                });
                reservations.push(...allocated);
            }
        }
        catch (err) {
            booking.status = shared_1.BookingStatus.FAILED;
            booking.bookingVersion += 1;
            await booking.save();
            if (reservations.length > 0) {
                const failedReservations = await reservation_service_1.ReservationService.transitionForBooking(booking._id, shared_1.ReservationStatus.FAILED, {
                    reason: 'booking-reservation-allocation-failed',
                    correlationId: booking.bookingId,
                });
                await reservation_service_1.ReservationService.releaseCapacityForTerminalReservations(failedReservations);
            }
            logger_1.logger.warn({ err, bookingId: booking._id, eventId: event._id }, 'Booking failed during reservation allocation');
            throw err;
        }
        booking.reservationIds = reservations.map((reservation) => reservation.reservationId);
        booking.bookingVersion += 1;
        await booking.save();
        // Update Seat statuses to LOCKED in MongoDB for the booking (to prevent other checkout threads booking it)
        if (event.bookingMode === shared_1.BookingMode.SEAT_BASED) {
            const allSeatIds = data.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
            const reservationBySeat = new Map(reservations.filter((reservation) => reservation.seatId).map((reservation) => [reservation.seatId, reservation.reservationId]));
            await seat_layout_schema_1.SeatLayout.updateOne({ eventId: event._id }, {
                $set: {
                    'seats.$[seat].status': shared_1.SeatStatus.LOCKED,
                    'seats.$[seat].lockedBy': sessionId,
                    'seats.$[seat].lockedAt': new Date(),
                    'seats.$[seat].bookedByBookingId': booking._id.toString(),
                },
                $inc: {
                    'seats.$[seat].seatVersion': 1,
                },
            }, {
                arrayFilters: [{ 'seat.seatId': { $in: allSeatIds } }],
            });
            for (const [seatId, reservationId] of reservationBySeat.entries()) {
                await seat_layout_schema_1.SeatLayout.updateOne({ eventId: event._id, 'seats.seatId': seatId }, { $set: { 'seats.$.reservationId': reservationId } });
            }
            const redis = (0, redis_1.getRedis)();
            for (const seatId of allSeatIds) {
                const lockKey = `mad:lock:event:${event._id}:seat:${seatId}`;
                const lockOwner = await redis.get(lockKey);
                if (lockOwner === sessionId) {
                    await redis.del(lockKey);
                }
            }
            try {
                (0, socket_1.emitToEvent)(event._id.toString(), 'seat:reserved', {
                    eventId: event._id.toString(),
                    bookingId: booking._id.toString(),
                    seatIds: allSeatIds,
                });
            }
            catch (err) {
                logger_1.logger.debug({ err, eventId: event._id, bookingId: booking._id }, 'Socket emit skipped for seat reservation');
            }
            logger_1.logger.info({ eventId: event._id, bookingId: booking._id, seatIds: allSeatIds }, 'Seat inventory reserved for checkout');
        }
        try {
            (0, socket_1.emitToAdmin)('bookings', 'booking:created', {
                bookingId: booking._id.toString(),
                eventId: event._id.toString(),
                status: booking.status,
                reservationIds: booking.reservationIds,
                bookingVersion: booking.bookingVersion,
            });
        }
        catch (err) {
            logger_1.logger.debug({ err, bookingId: booking._id }, 'Admin socket emit skipped for booking creation');
        }
        return booking;
    }
    static async markReservationsPendingPayment(bookingId, paymentReference, paymentId) {
        return reservation_service_1.ReservationService.transitionForBooking(bookingId, shared_1.ReservationStatus.PENDING_PAYMENT, {
            paymentReference,
            paymentId,
            reason: 'payment-intent-created',
            correlationId: bookingId,
        });
    }
    static async getBookingByReference(bookingId) {
        const query = mongoose_1.Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
        const booking = await booking_schema_1.Booking.findOne(query)
            .populate({
            path: 'eventId',
            populate: { path: 'venueId' },
        })
            .populate('paymentId');
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        const { Ticket } = await Promise.resolve().then(() => __importStar(require('../../models/ticket.schema')));
        const tickets = await Ticket.find({ bookingId: booking._id });
        return { booking, tickets };
    }
    static async getMyBookings(userId) {
        const bookings = await booking_schema_1.Booking.find({ userId: new mongoose_1.Types.ObjectId(userId) })
            .populate({
            path: 'eventId',
            populate: { path: 'venueId' },
        })
            .sort({ createdAt: -1 });
        const { Ticket } = await Promise.resolve().then(() => __importStar(require('../../models/ticket.schema')));
        const bookingIds = bookings.map((b) => b._id);
        const tickets = await Ticket.find({ bookingId: { $in: bookingIds } });
        return { bookings, tickets };
    }
}
exports.PublicBookingService = PublicBookingService;
//# sourceMappingURL=booking.service.js.map