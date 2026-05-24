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
const Booking_model_1 = require("../models/Booking.model");
const Event_model_1 = require("../models/Event.model");
const Coupon_model_1 = require("../models/Coupon.model");
const SeatLayout_model_1 = require("../models/SeatLayout.model");
const error_middleware_1 = require("../middleware/error.middleware");
const redis_1 = require("../config/redis");
const shared_1 = require("@mad/shared");
class PublicBookingService {
    static async createBooking(data, sessionId) {
        const event = await Event_model_1.Event.findById(data.eventId);
        if (!event || event.status !== 'published') {
            throw error_middleware_1.AppError.notFound('Event not found or not published');
        }
        if (event.isSoldOut) {
            throw error_middleware_1.AppError.badRequest('Event is sold out');
        }
        let subtotal = 0;
        let totalTicketsCount = 0;
        const finalTickets = [];
        // Validate Tiers and Quantities
        for (const ticketReq of data.tickets) {
            const tierConfig = event.ticketTiers.find((t) => t.tier === ticketReq.tier && t.isActive);
            if (!tierConfig) {
                throw error_middleware_1.AppError.badRequest(`Ticket tier "${ticketReq.tier}" is invalid or inactive`);
            }
            // Check tier capacity
            if (tierConfig.soldCount + ticketReq.quantity > tierConfig.totalCapacity) {
                throw error_middleware_1.AppError.badRequest(`Requested quantity for tier "${ticketReq.tier}" exceeds remaining capacity`);
            }
            const tierSubtotal = tierConfig.price * ticketReq.quantity;
            subtotal += tierSubtotal;
            totalTicketsCount += ticketReq.quantity;
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
            const seatLayout = await SeatLayout_model_1.SeatLayout.findOne({ eventId: event._id });
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
        // Pricing calculations (₹30 per ticket convenience fee, 18% GST on convenience fee + subtotal)
        const convenienceFee = 30 * totalTicketsCount;
        const gstPercent = 18;
        const preTaxSub = subtotal + convenienceFee;
        const gst = Math.round((preTaxSub * gstPercent) / 100);
        // Apply Coupon
        let discount = 0;
        let couponId;
        if (data.couponCode) {
            const coupon = await Coupon_model_1.Coupon.findOne({ code: data.couponCode.toUpperCase() });
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
        const booking = new Booking_model_1.Booking({
            eventId: event._id,
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
        // Update Seat statuses to LOCKED in MongoDB for the booking (to prevent other checkout threads booking it)
        if (event.bookingMode === shared_1.BookingMode.SEAT_BASED) {
            const allSeatIds = data.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
            await SeatLayout_model_1.SeatLayout.updateOne({ eventId: event._id }, {
                $set: {
                    'seats.$[seat].status': shared_1.SeatStatus.LOCKED,
                    'seats.$[seat].lockedBy': sessionId,
                    'seats.$[seat].lockedAt': new Date(),
                    'seats.$[seat].bookedByBookingId': booking._id.toString(),
                },
            }, {
                arrayFilters: [{ 'seat.seatId': { $in: allSeatIds } }],
            });
        }
        return booking;
    }
    static async getBookingByReference(bookingId) {
        const booking = await Booking_model_1.Booking.findOne({ bookingId })
            .populate({
            path: 'eventId',
            populate: { path: 'venueId' },
        })
            .populate('paymentId');
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        const { Ticket } = await Promise.resolve().then(() => __importStar(require('../models/Ticket.model')));
        const tickets = await Ticket.find({ bookingId: booking._id });
        return { booking, tickets };
    }
}
exports.PublicBookingService = PublicBookingService;
//# sourceMappingURL=booking.public.service.js.map