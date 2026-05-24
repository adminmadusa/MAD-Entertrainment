"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Refund = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const refundSchema = new mongoose_1.Schema({
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    reason: String,
    status: {
        type: String,
        enum: Object.values(shared_1.RefundStatus),
        default: shared_1.RefundStatus.REQUESTED,
        index: true,
    },
    processedAt: Date,
    gatewayRefundId: { type: String, index: true, sparse: true },
    adminNotes: String,
    requestedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    processedByAdminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });
exports.Refund = (0, mongoose_1.model)('Refund', refundSchema);
//# sourceMappingURL=refund.schema.js.map