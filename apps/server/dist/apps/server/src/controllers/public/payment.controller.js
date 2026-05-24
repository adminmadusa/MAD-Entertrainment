"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayWebhook = exports.stripeWebhook = exports.verifyPayment = exports.createPaymentIntent = void 0;
// Dynamically require csurf to avoid type declaration issues
const csurf = require('csurf');
const errorHandler_1 = require("../../utils/errorHandler");
const payment_service_1 = require("../../services/public/payment.service");
const response_1 = require("../../utils/response");
const booking_schema_1 = require("../../models/booking.schema");
const auth_middleware_1 = require("../../middleware/auth.middleware");
exports.createPaymentIntent = (0, errorHandler_1.asyncWrapper)(async (req, res) => {
    const { bookingId, gateway } = req.body;
    // Load booking and verify ownership
    const booking = await booking_schema_1.Booking.findById(bookingId);
    if (!booking) {
        (0, response_1.sendError)(res, 'Booking not found', 404);
        return;
    }
    (0, auth_middleware_1.ensureBookingOwner)(req.user?.userId, booking.userId);
    const result = await payment_service_1.PaymentService.createPaymentIntent(bookingId, gateway);
    (0, response_1.sendSuccess)(res, result, 'Payment intent/order initialized');
});
exports.verifyPayment = (0, errorHandler_1.asyncWrapper)(async (req, res) => {
    const { bookingId, ...gatewayPayload } = req.body;
    const result = await payment_service_1.PaymentService.verifyPayment(bookingId, gatewayPayload);
    (0, response_1.sendSuccess)(res, result, 'Payment verified and booking confirmed');
});
exports.stripeWebhook = (0, errorHandler_1.asyncWrapper)(async (req, res) => {
    // Simulates Stripe webhook log
    const _event = req.body;
    (0, response_1.sendSuccess)(res, { received: true }, 'Webhook processed');
});
exports.razorpayWebhook = (0, errorHandler_1.asyncWrapper)(async (req, res) => {
    // Simulates Razorpay webhook log
    const _event = req.body;
    (0, response_1.sendSuccess)(res, { received: true }, 'Webhook processed');
});
//# sourceMappingURL=payment.controller.js.map