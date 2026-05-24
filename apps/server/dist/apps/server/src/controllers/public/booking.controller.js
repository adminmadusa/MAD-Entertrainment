"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionToken = getSessionToken;
exports.createBooking = createBooking;
exports.getBooking = getBooking;
exports.getMyBookings = getMyBookings;
const crypto_1 = __importDefault(require("crypto"));
const booking_service_1 = require("../../services/public/booking.service");
const response_1 = require("../../utils/response");
const jwt_1 = require("../../utils/jwt");
async function getSessionToken(req, res, next) {
    try {
        const sessionId = crypto_1.default.randomUUID();
        const token = (0, jwt_1.signSessionToken)(sessionId);
        res.json({ success: true, data: { token, sessionId } });
    }
    catch (err) {
        next(err);
    }
}
async function createBooking(req, res, next) {
    try {
        const sessionToken = req.header('x-session-id');
        if (!sessionToken) {
            res.status(401).json({ success: false, message: 'Missing session token' });
            return;
        }
        const sessionId = (0, jwt_1.verifySessionToken)(sessionToken);
        const booking = await booking_service_1.PublicBookingService.createBooking(req.body, sessionId, req.user?.sub);
        (0, response_1.sendCreated)(res, booking, 'Booking created');
    }
    catch (err) {
        next(err);
    }
}
async function getBooking(req, res, next) {
    try {
        const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
        const sessionToken = req.header('x-session-id');
        let sessionId;
        if (sessionToken) {
            try {
                sessionId = (0, jwt_1.verifySessionToken)(sessionToken);
            }
            catch (err) {
                // invalid token ignored for now
            }
        }
        const userId = req.user?.sub;
        const result = await booking_service_1.PublicBookingService.getBookingByReference(bookingId);
        const isOwner = result.booking.userId?.toString() === userId;
        const isSessionOwner = result.booking.sessionId === sessionId;
        const isLegacy = !result.booking.userId && !result.booking.sessionId;
        if (!isOwner && !isSessionOwner && !isLegacy) {
            res.status(403).json({ success: false, message: 'Forbidden' });
            return;
        }
        (0, response_1.sendSuccess)(res, result, 'Booking retrieved');
    }
    catch (err) {
        next(err);
    }
}
async function getMyBookings(req, res, next) {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const result = await booking_service_1.PublicBookingService.getMyBookings(userId);
        (0, response_1.sendSuccess)(res, result, 'Bookings retrieved');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=booking.controller.js.map