"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose_1 = require("mongoose");
const shared_1 = require("@mad/shared");
const paymentSchema = new mongoose_1.Schema({
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    gateway: { type: String, enum: Object.values(shared_1.PaymentGateway), required: true },
    method: { type: String, enum: Object.values(shared_1.PaymentMethod) },
    status: {
        type: String,
        enum: Object.values(shared_1.PaymentStatus),
        default: shared_1.PaymentStatus.PENDING,
        index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true, sparse: true },
    gatewaySignature: String,
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    failureReason: String,
    receiptUrl: String,
    invoiceUrl: String,
    idempotencyKey: { type: String, unique: true, sparse: true }, // Prevents duplicate charges
}, { timestamps: true });
paymentSchema.index({ gatewayOrderId: 1, gateway: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
exports.Payment = (0, mongoose_1.model)('Payment', paymentSchema);
//# sourceMappingURL=Payment.model.js.map