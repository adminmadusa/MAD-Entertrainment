"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBookings = listBookings;
exports.getBooking = getBooking;
exports.cancelBooking = cancelBooking;
const error_middleware_1 = require("../../middleware/error.middleware");
const booking_schema_1 = require("../../models/booking.schema");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
async function listBookings(req, res) {
    const { page, limit, skip } = (0, response_1.parsePaginationParams)(req.query);
    const { status, eventId, search } = req.query;
    const filter = {};
    if (status)
        filter['status'] = status;
    if (eventId)
        filter['eventId'] = eventId;
    if (search) {
        filter['$or'] = [
            { bookingId: { $regex: search, $options: 'i' } },
            { 'guestInfo.email': { $regex: search, $options: 'i' } },
            { 'guestInfo.phone': { $regex: search, $options: 'i' } },
        ];
    }
    const [bookings, total] = await Promise.all([
        booking_schema_1.Booking.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('eventId', 'title startDate coverImage')
            .populate('userId', 'name email phone')
            .select('-__v'),
        booking_schema_1.Booking.countDocuments(filter),
    ]);
    (0, response_1.sendPaginated)(res, bookings, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getBooking(req, res) {
    const booking = await booking_schema_1.Booking.findById(req.params.id)
        .populate('eventId', 'title startDate venue coverImage')
        .populate('userId', 'name email phone')
        .populate('paymentId');
    if (!booking)
        throw error_middleware_1.AppError.notFound('Booking');
    (0, response_1.sendSuccess)(res, booking);
}
async function cancelBooking(req, res) {
    const { reason } = req.body;
    const booking = await booking_schema_1.Booking.findById(req.params.id);
    if (!booking)
        throw error_middleware_1.AppError.notFound('Booking');
    if (booking.status === 'cancelled')
        throw error_middleware_1.AppError.badRequest('Booking is already cancelled');
    booking.status = 'cancelled';
    booking.cancellationReason = reason ?? 'Cancelled by admin';
    booking.cancelledAt = new Date();
    await booking.save();
    logger_1.logger.info({ bookingId: booking._id, adminId: req.admin?.adminId }, 'Admin cancelled booking');
    (0, response_1.sendSuccess)(res, booking, 'Booking cancelled successfully');
}
//# sourceMappingURL=booking.controller.js.map