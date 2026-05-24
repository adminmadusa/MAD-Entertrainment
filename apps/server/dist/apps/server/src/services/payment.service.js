"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Booking_model_1 = require("../models/Booking.model");
const Payment_model_1 = require("../models/Payment.model");
const Event_model_1 = require("../models/Event.model");
const Coupon_model_1 = require("../models/Coupon.model");
const SeatLayout_model_1 = require("../models/SeatLayout.model");
const Ticket_model_1 = require("../models/Ticket.model");
const Notification_model_1 = require("../models/Notification.model");
const razorpay_1 = require("../config/razorpay");
const stripe_1 = require("../config/stripe");
const env_1 = require("../config/env");
const error_middleware_1 = require("../middleware/error.middleware");
const shared_1 = require("@mad/shared");
const logger_1 = require("../utils/logger");
class PaymentService {
    static async createPaymentIntent(bookingId, gateway) {
        const booking = await Booking_model_1.Booking.findById(bookingId);
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        if (booking.status !== shared_1.BookingStatus.AWAITING_PAYMENT) {
            throw error_middleware_1.AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
        }
        const env = (0, env_1.getEnv)();
        if (gateway === 'razorpay') {
            if (!(0, razorpay_1.isRazorpayEnabled)()) {
                // Developmental fallback mode
                const mockOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 10);
                const payment = await Payment_model_1.Payment.create({
                    bookingId: booking._id,
                    gateway: 'razorpay',
                    status: shared_1.PaymentStatus.PENDING,
                    amount: booking.totalAmount,
                    currency: 'INR',
                    gatewayOrderId: mockOrderId,
                });
                booking.paymentId = payment._id;
                await booking.save();
                return {
                    gateway: 'razorpay',
                    keyId: 'rzp_test_mockkey',
                    orderId: mockOrderId,
                    amount: Math.round(booking.totalAmount * 100),
                    currency: 'INR',
                    bookingId: booking._id,
                    isMock: true,
                };
            }
            const rzp = (0, razorpay_1.getRazorpay)();
            const order = await rzp.orders.create({
                amount: Math.round(booking.totalAmount * 100), // Paise
                currency: 'INR',
                receipt: booking.bookingId,
            });
            const payment = await Payment_model_1.Payment.create({
                bookingId: booking._id,
                gateway: 'razorpay',
                status: shared_1.PaymentStatus.PENDING,
                amount: booking.totalAmount,
                currency: 'INR',
                gatewayOrderId: order.id,
            });
            booking.paymentId = payment._id;
            await booking.save();
            return {
                gateway: 'razorpay',
                keyId: env.RAZORPAY_KEY_ID,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                bookingId: booking._id,
            };
        }
        else {
            if (!(0, stripe_1.isStripeEnabled)()) {
                // Developmental fallback mode
                const mockIntentId = 'pi_mock_' + Math.random().toString(36).substring(2, 10);
                const payment = await Payment_model_1.Payment.create({
                    bookingId: booking._id,
                    gateway: 'stripe',
                    status: shared_1.PaymentStatus.PENDING,
                    amount: booking.totalAmount,
                    currency: booking.currency || 'INR',
                    gatewayOrderId: mockIntentId,
                });
                booking.paymentId = payment._id;
                await booking.save();
                return {
                    gateway: 'stripe',
                    publishableKey: 'pk_test_mockkey',
                    clientSecret: mockIntentId + '_secret_mock',
                    amount: booking.totalAmount,
                    currency: booking.currency || 'INR',
                    bookingId: booking._id,
                    isMock: true,
                };
            }
            const stripe = (0, stripe_1.getStripe)();
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(booking.totalAmount * 100), // Cents / Paise depending on currency
                currency: booking.currency?.toLowerCase() || 'inr',
                metadata: {
                    bookingId: booking._id.toString(),
                    bookingRef: booking.bookingId,
                },
            });
            const payment = await Payment_model_1.Payment.create({
                bookingId: booking._id,
                gateway: 'stripe',
                status: shared_1.PaymentStatus.PENDING,
                amount: booking.totalAmount,
                currency: booking.currency || 'INR',
                gatewayOrderId: paymentIntent.id,
            });
            booking.paymentId = payment._id;
            await booking.save();
            return {
                gateway: 'stripe',
                publishableKey: env.STRIPE_PUBLISHABLE_KEY,
                clientSecret: paymentIntent.client_secret,
                amount: booking.totalAmount,
                currency: booking.currency,
                bookingId: booking._id,
            };
        }
    }
    static async verifyPayment(bookingId, gatewayPayload) {
        const booking = await Booking_model_1.Booking.findById(bookingId);
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        const payment = await Payment_model_1.Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
        if (!payment) {
            throw error_middleware_1.AppError.notFound('Payment record not found for booking');
        }
        if (payment.status === shared_1.PaymentStatus.PAID) {
            return booking; // Already verified & confirmed
        }
        const env = (0, env_1.getEnv)();
        if (payment.gateway === 'razorpay') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload;
            // Handle mock verification bypass
            if (razorpay_order_id && razorpay_order_id.startsWith('order_mock_')) {
                payment.status = shared_1.PaymentStatus.PAID;
                payment.gatewayPaymentId = razorpay_payment_id || 'pay_mock_' + Math.random().toString(36).substring(2, 10);
                payment.paidAt = new Date();
                await payment.save();
                await this.confirmBooking(booking, payment);
                return booking;
            }
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                throw error_middleware_1.AppError.badRequest('Missing Razorpay credentials in payment payload');
            }
            const text = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto_1.default
                .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
                .update(text)
                .digest('hex');
            if (expectedSignature !== razorpay_signature) {
                payment.status = shared_1.PaymentStatus.FAILED;
                payment.failedAt = new Date();
                payment.failureReason = 'Signature verification failed';
                await payment.save();
                booking.status = shared_1.BookingStatus.FAILED;
                await booking.save();
                throw error_middleware_1.AppError.badRequest('Razorpay signature verification failed');
            }
            payment.status = shared_1.PaymentStatus.PAID;
            payment.gatewayPaymentId = razorpay_payment_id;
            payment.gatewaySignature = razorpay_signature;
            payment.paidAt = new Date();
            await payment.save();
            await this.confirmBooking(booking, payment);
        }
        else {
            const { paymentIntentId } = gatewayPayload;
            if (!paymentIntentId) {
                throw error_middleware_1.AppError.badRequest('Missing Stripe paymentIntentId in payment payload');
            }
            // Handle mock verification bypass
            if (paymentIntentId.startsWith('pi_mock_')) {
                payment.status = shared_1.PaymentStatus.PAID;
                payment.gatewayPaymentId = paymentIntentId;
                payment.paidAt = new Date();
                await payment.save();
                await this.confirmBooking(booking, payment);
                return booking;
            }
            const stripe = (0, stripe_1.getStripe)();
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (intent.status !== 'succeeded') {
                payment.status = shared_1.PaymentStatus.FAILED;
                payment.failedAt = new Date();
                payment.failureReason = `Stripe status: ${intent.status}`;
                await payment.save();
                booking.status = shared_1.BookingStatus.FAILED;
                await booking.save();
                throw error_middleware_1.AppError.badRequest(`Stripe payment verification failed. Status is ${intent.status}`);
            }
            payment.status = shared_1.PaymentStatus.PAID;
            payment.gatewayPaymentId = intent.id;
            payment.paidAt = new Date();
            await payment.save();
            await this.confirmBooking(booking, payment);
        }
        return booking;
    }
    static async confirmBooking(booking, payment) {
        // 1. Confirm booking status
        booking.status = shared_1.BookingStatus.CONFIRMED;
        booking.expiresAt = undefined; // Cancel pending booking automatic expiration TTL
        await booking.save();
        // 2. Update Event statistics
        const event = await Event_model_1.Event.findById(booking.eventId);
        if (event) {
            event.soldCount += booking.totalTickets;
            if (event.soldCount >= event.totalCapacity) {
                event.isSoldOut = true;
            }
            // Update sold count per ticket tier
            for (const bookedTicket of booking.tickets) {
                const tierIndex = event.ticketTiers.findIndex((t) => t.tier === bookedTicket.tier);
                if (tierIndex !== -1) {
                    event.ticketTiers[tierIndex].soldCount += bookedTicket.quantity;
                }
            }
            await event.save();
        }
        // 3. Update Seat Layout statuses from LOCKED to BOOKED
        if (event && event.bookingMode === 'seat_based') {
            const allSeatIds = booking.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
            await SeatLayout_model_1.SeatLayout.updateOne({ eventId: event._id }, {
                $set: {
                    'seats.$[seat].status': shared_1.SeatStatus.BOOKED,
                    'seats.$[seat].lockedBy': undefined,
                    'seats.$[seat].lockedAt': undefined,
                },
            }, {
                arrayFilters: [{ 'seat.seatId': { $in: allSeatIds } }],
            });
        }
        // 4. Update Coupon used count if applied
        if (booking.couponId) {
            await Coupon_model_1.Coupon.findByIdAndUpdate(booking.couponId, { $inc: { usedCount: 1 } });
        }
        // 5. Generate scan-ready QR Tickets
        let ticketIndex = 1;
        for (const bookedTicket of booking.tickets) {
            if (event && event.bookingMode === 'seat_based' && bookedTicket.seats) {
                for (const seat of bookedTicket.seats) {
                    const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
                    const qrCodeText = JSON.stringify({
                        ticketId,
                        bookingId: booking._id.toString(),
                        eventId: event._id.toString(),
                        tier: bookedTicket.tier,
                        seatId: seat.seatId,
                    });
                    await Ticket_model_1.Ticket.create({
                        ticketId,
                        bookingId: booking._id,
                        eventId: booking.eventId,
                        tierName: bookedTicket.tierName,
                        tier: bookedTicket.tier,
                        seatId: seat.seatId,
                        row: seat.row,
                        seatNumber: seat.number,
                        section: seat.section,
                        qrCode: qrCodeText,
                        qrCodeImage: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeText)}`,
                    });
                    ticketIndex++;
                }
            }
            else {
                // General admission - generate QRs matching count
                for (let i = 0; i < bookedTicket.quantity; i++) {
                    const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
                    const qrCodeText = JSON.stringify({
                        ticketId,
                        bookingId: booking._id.toString(),
                        eventId: booking.eventId.toString(),
                        tier: bookedTicket.tier,
                    });
                    await Ticket_model_1.Ticket.create({
                        ticketId,
                        bookingId: booking._id,
                        eventId: booking.eventId,
                        tierName: bookedTicket.tierName,
                        tier: bookedTicket.tier,
                        qrCode: qrCodeText,
                        qrCodeImage: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeText)}`,
                    });
                    ticketIndex++;
                }
            }
        }
        // 6. Write to notification logs queue
        try {
            const emailBody = `Hi ${booking.guestName},\n\nYour booking ${booking.bookingId} for the event "${event?.title || 'MAD Event'}" has been confirmed! Enjoy the show.`;
            await Notification_model_1.Notification.create({
                type: shared_1.NotificationType.BOOKING_CONFIRMED,
                bookingId: booking._id,
                eventId: booking.eventId,
                channel: 'email',
                recipient: booking.guestEmail,
                subject: `Booking Confirmed: ${booking.bookingId}`,
                body: emailBody,
                isSent: true, // Marked as sent to simulate complete delivery logs
                retryCount: 0,
            });
            logger_1.logger.info({ bookingId: booking._id }, 'Notification log created for confirmed booking');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Failed to record notification confirmation log');
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map