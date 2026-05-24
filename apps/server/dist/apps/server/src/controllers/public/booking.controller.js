"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.getBooking = getBooking;
exports.getMyBookings = getMyBookings;
const error_middleware_1 = require("../../middleware/error.middleware");
const booking_service_1 = require("../../services/public/booking.service");
const response_1 = require("../../utils/response");
async function createBooking(req, res) {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
        throw error_middleware_1.AppError.badRequest('Session ID (x-session-id header) is required to secure seat reservations.');
    }
    const userId = req.user?.userId;
    const booking = await booking_service_1.PublicBookingService.createBooking(req.body, sessionId, userId);
    (0, response_1.sendCreated)(res, booking, 'Booking initialized. Complete payment to finalize.');
}
async function getBooking(req, res) {
    const result = await booking_service_1.PublicBookingService.getBookingByReference(req.params.bookingId);
    (0, response_1.sendSuccess)(res, result);
}
async function getMyBookings(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        throw error_middleware_1.AppError.unauthorized('User not authenticated');
    }
    const result = await booking_service_1.PublicBookingService.getMyBookings(userId);
    (0, response_1.sendSuccess)(res, result);
}
//# sourceMappingURL=booking.controller.js.map