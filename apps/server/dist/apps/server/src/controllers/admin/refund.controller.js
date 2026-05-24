"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRefunds = listRefunds;
exports.createRefund = createRefund;
exports.processRefund = processRefund;
const shared_1 = require("@mad/shared");
const error_middleware_1 = require("../../middleware/error.middleware");
const booking_schema_1 = require("../../models/booking.schema");
const refund_schema_1 = require("../../models/refund.schema");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
async function listRefunds(req, res) {
    const { page, limit, skip } = (0, response_1.parsePaginationParams)(req.query);
    const { status } = req.query;
    const filter = {};
    if (status)
        filter['status'] = status;
    const [refunds, total] = await Promise.all([
        refund_schema_1.Refund.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('bookingId', 'bookingId guestInfo')
            .populate('paymentId', 'amount gateway gatewayOrderId'),
        refund_schema_1.Refund.countDocuments(filter),
    ]);
    (0, response_1.sendPaginated)(res, refunds, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function createRefund(req, res) {
    const { bookingId, paymentId, amount, reason } = req.body;
    const booking = await booking_schema_1.Booking.findById(bookingId);
    if (!booking)
        throw error_middleware_1.AppError.notFound('Booking');
    const existing = await refund_schema_1.Refund.findOne({ bookingId, status: { $nin: ['failed', 'rejected'] } });
    if (existing)
        throw error_middleware_1.AppError.conflict('A refund already exists for this booking');
    const refund = await refund_schema_1.Refund.create({
        bookingId,
        paymentId,
        amount,
        reason,
        status: shared_1.RefundStatus.REQUESTED,
        requestedById: booking.userId,
        processedByAdminId: req.admin?.adminId,
    });
    logger_1.logger.info({ refundId: refund._id, bookingId }, 'Admin created refund');
    (0, response_1.sendCreated)(res, refund, 'Refund created successfully');
}
async function processRefund(req, res) {
    const { action, adminNotes, gatewayRefundId } = req.body;
    if (!['approve', 'reject'].includes(action)) {
        throw error_middleware_1.AppError.badRequest('Action must be "approve" or "reject"');
    }
    const refund = await refund_schema_1.Refund.findById(req.params.id);
    if (!refund)
        throw error_middleware_1.AppError.notFound('Refund');
    if (refund.status !== shared_1.RefundStatus.REQUESTED) {
        throw error_middleware_1.AppError.badRequest(`Refund is already ${refund.status}`);
    }
    refund.status = action === 'approve' ? shared_1.RefundStatus.COMPLETED : shared_1.RefundStatus.FAILED;
    refund.adminNotes = adminNotes;
    refund.processedByAdminId = req.admin?.adminId;
    refund.processedAt = new Date();
    if (gatewayRefundId)
        refund.gatewayRefundId = gatewayRefundId;
    await refund.save();
    logger_1.logger.info({ refundId: refund._id, action, adminId: req.admin?.adminId }, `Refund ${action}d`);
    (0, response_1.sendSuccess)(res, refund, `Refund ${action}d successfully`);
}
//# sourceMappingURL=refund.controller.js.map