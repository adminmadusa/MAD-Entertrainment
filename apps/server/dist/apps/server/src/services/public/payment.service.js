"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const shared_1 = require("@mad/shared");
const socket_1 = require("../../config/socket");
const env_1 = require("../../config/env");
const payment_errors_1 = require("./payment.errors");
const razorpay_1 = require("../../config/razorpay");
const stripe_1 = require("../../config/stripe");
const error_middleware_1 = require("../../middleware/error.middleware");
const booking_schema_1 = require("../../models/booking.schema");
const coupon_schema_1 = require("../../models/coupon.schema");
const event_schema_1 = require("../../models/event.schema");
const notification_schema_1 = require("../../models/notification.schema");
const payment_schema_1 = require("../../models/payment.schema");
const seat_layout_schema_1 = require("../../models/seat-layout.schema");
const ticket_schema_1 = require("../../models/ticket.schema");
const logger_1 = require("../../utils/logger");
const email_1 = require("../../utils/email");
const pdf_1 = require("../../utils/pdf");
const reservation_service_1 = require("../reservation.service");
class PaymentService {
    static async createPaymentIntent(bookingId, gateway) {
        const booking = await booking_schema_1.Booking.findById(bookingId);
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        if (booking.status !== shared_1.BookingStatus.AWAITING_PAYMENT) {
            throw error_middleware_1.AppError.badRequest(`Booking is in state "${booking.status}" and cannot accept payment`);
        }
        const env = (0, env_1.getEnv)();
        if (gateway === 'razorpay') {
            return await this.handleRazorpayIntent(booking, env);
        }
        else {
            return await this.handleStripeIntent(booking, env);
        }
    }
    // Private helper for Razorpay intent creation
    static async handleRazorpayIntent(booking, env) {
        if (!(0, razorpay_1.isRazorpayEnabled)()) {
            throw error_middleware_1.AppError.badRequest('Razorpay is not enabled / credentials missing');
        }
        const amountPaise = Math.round(booking.totalAmount * 100);
        if (amountPaise < 100) {
            throw new payment_errors_1.InsufficientAmountError();
        }
        try {
            const rzp = (0, razorpay_1.getRazorpay)();
            const order = await rzp.orders.create({
                amount: amountPaise, // Paise
                currency: 'INR',
                receipt: booking.bookingId,
            });
            const payment = await payment_schema_1.Payment.create({
                bookingId: booking._id,
                gateway: 'razorpay',
                status: shared_1.PaymentStatus.PENDING,
                amount: booking.totalAmount,
                currency: 'INR',
                gatewayOrderId: order.id,
            });
            booking.paymentId = payment._id;
            booking.bookingVersion += 1;
            await booking.save();
            await reservation_service_1.ReservationService.transitionForBooking(booking._id, shared_1.ReservationStatus.PENDING_PAYMENT, {
                paymentReference: order.id,
                paymentId: payment._id,
                reason: 'razorpay-intent-created',
                correlationId: booking.bookingId,
            });
            return {
                gateway: 'razorpay',
                keyId: env.RAZORPAY_KEY_ID,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                bookingId: booking._id,
            };
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Razorpay API call failed');
            const statusCode = err.statusCode || 400;
            const description = err.error?.description || err.message || 'Razorpay order creation failed';
            throw new error_middleware_1.AppError(`Razorpay payment intent failed: ${description}`, statusCode);
        }
    }
    // Private helper for Stripe intent creation
    static async handleStripeIntent(booking, env) {
        if (!(0, stripe_1.isStripeEnabled)()) {
            throw error_middleware_1.AppError.badRequest('Stripe is not enabled / credentials missing');
        }
        try {
            const stripe = (0, stripe_1.getStripe)();
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(booking.totalAmount * 100), // Cents / Paise depending on currency
                currency: booking.currency?.toLowerCase() || 'inr',
                metadata: {
                    bookingId: booking._id.toString(),
                    bookingRef: booking.bookingId,
                },
            });
            const payment = await payment_schema_1.Payment.create({
                bookingId: booking._id,
                gateway: 'stripe',
                status: shared_1.PaymentStatus.PENDING,
                amount: booking.totalAmount,
                currency: booking.currency || 'INR',
                gatewayOrderId: paymentIntent.id,
            });
            booking.paymentId = payment._id;
            booking.bookingVersion += 1;
            await booking.save();
            await reservation_service_1.ReservationService.transitionForBooking(booking._id, shared_1.ReservationStatus.PENDING_PAYMENT, {
                paymentReference: paymentIntent.id,
                paymentId: payment._id,
                reason: 'stripe-intent-created',
                correlationId: booking.bookingId,
            });
            return {
                gateway: 'stripe',
                publishableKey: env.STRIPE_PUBLISHABLE_KEY,
                clientSecret: paymentIntent.client_secret,
                amount: booking.totalAmount,
                currency: booking.currency,
                bookingId: booking._id,
            };
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Stripe API call failed');
            const statusCode = err.statusCode || 400;
            const description = err.message || 'Stripe payment intent creation failed';
            throw new error_middleware_1.AppError(`Stripe payment intent failed: ${description}`, statusCode);
        }
    }
    static async verifyPayment(bookingId, gatewayPayload) {
        const booking = await booking_schema_1.Booking.findById(bookingId);
        if (!booking) {
            throw error_middleware_1.AppError.notFound('Booking not found');
        }
        const payment = await payment_schema_1.Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
        if (!payment) {
            throw error_middleware_1.AppError.notFound('Payment record not found for booking');
        }
        if (payment.status === shared_1.PaymentStatus.PAID) {
            return booking; // Already verified & confirmed
        }
        const env = (0, env_1.getEnv)();
        if (payment.gateway === 'razorpay') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = gatewayPayload;
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                throw error_middleware_1.AppError.badRequest('Missing Razorpay credentials in payment payload');
            }
            const text = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto_1.default
                .createHmac('sha256', env.RAZORPAY_KEY_SECRET || '')
                .update(text)
                .digest('hex');
            if (expectedSignature !== razorpay_signature) {
                await this.failPaymentAndReleaseInventory(booking, payment, 'Signature verification failed');
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
            const stripe = (0, stripe_1.getStripe)();
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
            if (intent.status !== 'succeeded') {
                await this.failPaymentAndReleaseInventory(booking, payment, `Stripe status: ${intent.status}`);
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
    static safeEmit(label, emit, data) {
        try {
            emit();
        }
        catch (err) {
            logger_1.logger.debug({ err, ...data }, `Socket emit skipped: ${label}`);
        }
    }
    static async failPaymentAndReleaseInventory(booking, payment, reason) {
        payment.status = shared_1.PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = reason;
        await payment.save();
        booking.status = shared_1.BookingStatus.FAILED;
        booking.bookingVersion += 1;
        await booking.save();
        const failedReservations = await reservation_service_1.ReservationService.transitionForBooking(booking._id, shared_1.ReservationStatus.FAILED, {
            paymentReference: payment.gatewayPaymentId ?? payment.gatewayOrderId,
            paymentId: payment._id,
            reason,
            correlationId: booking.bookingId,
        });
        await reservation_service_1.ReservationService.releaseCapacityForTerminalReservations(failedReservations);
        const event = await event_schema_1.Event.findById(booking.eventId);
        const releasedSeatIds = [];
        if (event && event.bookingMode === 'seat_based') {
            const allSeatIds = booking.tickets.flatMap((ticket) => ticket.seats || []).map((seat) => seat.seatId);
            if (allSeatIds.length > 0) {
                await seat_layout_schema_1.SeatLayout.updateOne({ eventId: event._id }, {
                    $set: {
                        'seats.$[seat].status': shared_1.SeatStatus.AVAILABLE,
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
                }, {
                    arrayFilters: [
                        {
                            'seat.seatId': { $in: allSeatIds },
                            'seat.status': shared_1.SeatStatus.LOCKED,
                            'seat.bookedByBookingId': booking._id.toString(),
                        },
                    ],
                });
                releasedSeatIds.push(...allSeatIds);
            }
        }
        if (event && releasedSeatIds.length > 0) {
            this.safeEmit('seat:unlocked', () => (0, socket_1.emitToEvent)(event._id.toString(), 'seat:unlocked', { seatIds: releasedSeatIds }), { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: releasedSeatIds });
        }
        this.safeEmit('booking:updated', () => (0, socket_1.emitToBooking)(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }), { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion });
        this.safeEmit('admin booking:updated', () => (0, socket_1.emitToAdmin)('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }), { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion });
        logger_1.logger.info({ bookingId: booking._id, paymentId: payment._id, releasedSeatIds, reason }, 'Payment failed and reserved inventory released');
    }
    static async confirmBooking(booking, _payment) {
        // 1. Confirm booking status exactly once. Concurrent payment callbacks must
        // not double-increment event inventory or create duplicate tickets.
        const confirmedBooking = await booking_schema_1.Booking.findOneAndUpdate({ _id: booking._id, status: shared_1.BookingStatus.AWAITING_PAYMENT }, { $set: { status: shared_1.BookingStatus.CONFIRMED }, $unset: { expiresAt: 1 }, $inc: { bookingVersion: 1 } }, { new: true });
        if (!confirmedBooking) {
            logger_1.logger.info({ bookingId: booking._id }, 'Booking confirmation skipped because booking is no longer awaiting payment');
            return;
        }
        booking = confirmedBooking;
        const confirmedReservations = await reservation_service_1.ReservationService.transitionForBooking(booking._id, shared_1.ReservationStatus.CONFIRMED, {
            paymentReference: _payment.gatewayPaymentId ?? _payment.gatewayOrderId,
            paymentId: _payment._id,
            reason: 'payment-confirmed',
            correlationId: booking.bookingId,
        });
        await reservation_service_1.ReservationService.confirmCapacity(confirmedReservations);
        // 2. Update Event statistics
        const event = await event_schema_1.Event.findById(booking.eventId);
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
            event.eventVersion += 1;
            await event.save();
        }
        // 3. Update Seat Layout statuses from LOCKED to BOOKED
        if (event && event.bookingMode === 'seat_based') {
            const allSeatIds = booking.tickets.flatMap((t) => t.seats || []).map((s) => s.seatId);
            await seat_layout_schema_1.SeatLayout.updateOne({ eventId: event._id }, {
                $set: {
                    'seats.$[seat].status': shared_1.SeatStatus.BOOKED,
                },
                $unset: {
                    'seats.$[seat].lockedBy': '',
                    'seats.$[seat].lockedAt': '',
                },
                $inc: {
                    'seats.$[seat].seatVersion': 1,
                },
            }, {
                arrayFilters: [{ 'seat.seatId': { $in: allSeatIds } }],
            });
            this.safeEmit('seat:booked', () => (0, socket_1.emitToEvent)(event._id.toString(), 'seat:booked', {
                eventId: event._id.toString(),
                bookingId: booking._id.toString(),
                seatIds: allSeatIds,
            }), { eventId: event._id.toString(), bookingId: booking._id.toString(), seatIds: allSeatIds });
        }
        this.safeEmit('booking:updated', () => (0, socket_1.emitToBooking)(booking._id.toString(), 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }), { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion });
        this.safeEmit('admin booking:updated', () => (0, socket_1.emitToAdmin)('bookings', 'booking:updated', { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion }), { bookingId: booking._id.toString(), status: booking.status, bookingVersion: booking.bookingVersion });
        this.safeEmit('admin analytics:changed', () => (0, socket_1.emitToAdmin)('analytics', 'analytics:changed', { bookingId: booking._id.toString(), eventId: booking.eventId.toString() }), { bookingId: booking._id.toString(), eventId: booking.eventId.toString() });
        // 4. Update Coupon used count if applied
        if (booking.couponId) {
            await coupon_schema_1.Coupon.findByIdAndUpdate(booking.couponId, { $inc: { usedCount: 1 } });
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
                        admits: 1,
                    });
                    await ticket_schema_1.Ticket.create({
                        ticketId,
                        bookingId: booking._id,
                        eventId: booking.eventId,
                        tierName: bookedTicket.tierName,
                        tier: bookedTicket.tier,
                        admits: 1,
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
                const tierConfig = event?.ticketTiers?.find(t => t.tier === bookedTicket.tier);
                const admits = tierConfig?.groupSize || 1;
                for (let i = 0; i < bookedTicket.quantity; i++) {
                    const ticketId = `TKT-${booking.bookingId}-${String(ticketIndex).padStart(3, '0')}`;
                    const qrCodeText = JSON.stringify({
                        ticketId,
                        bookingId: booking._id.toString(),
                        eventId: booking.eventId.toString(),
                        tier: bookedTicket.tier,
                        admits,
                    });
                    await ticket_schema_1.Ticket.create({
                        ticketId,
                        bookingId: booking._id,
                        eventId: booking.eventId,
                        tierName: bookedTicket.tierName,
                        tier: bookedTicket.tier,
                        admits,
                        qrCode: qrCodeText,
                        qrCodeImage: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrCodeText)}`,
                    });
                    ticketIndex++;
                }
            }
        }
        // 6. Generate PDF and Send Email asynchronously
        try {
            const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>Hi ${booking.guestName},</h2>
          <p>Your booking <strong>${booking.bookingId}</strong> for the event <strong>"${event?.title || 'MAD Event'}"</strong> has been successfully confirmed!</p>
          <p>Please find your ticket attached as a PDF document. You can present the QR code at the gate for entry.</p>
          <p>Enjoy the show!</p>
          <br/>
          <p>MAD Entertainment Team</p>
        </div>
      `;
            // Generate the PDF buffer
            const pdfBuffer = await (0, pdf_1.generateTicketPDF)(booking, event);
            // Send the email with the PDF attachment
            if (booking.guestEmail) {
                await (0, email_1.sendEmail)({
                    to: booking.guestEmail,
                    subject: `Your Ticket for ${event?.title || 'MAD Event'} [${booking.bookingId}]`,
                    html: emailBody,
                    attachments: [
                        {
                            filename: `MAD_Ticket_${booking.bookingId}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf',
                        },
                    ],
                });
            }
            await notification_schema_1.Notification.create({
                type: shared_1.NotificationType.BOOKING_CONFIRMED,
                bookingId: booking._id,
                eventId: booking.eventId,
                channel: 'email',
                recipient: booking.guestEmail,
                subject: `Booking Confirmed: ${booking.bookingId}`,
                body: 'Email dispatched with PDF ticket attached.',
                isSent: true,
                retryCount: 0,
            });
            logger_1.logger.info({ bookingId: booking._id }, 'Notification log created for confirmed booking and email dispatched');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'Failed to record notification confirmation log or send email');
        }
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map