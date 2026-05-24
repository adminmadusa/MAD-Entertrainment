"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const paymentSchema = new mongoose_1.Schema({
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    gateway: { type: String, enum: ['stripe', 'razorpay'], required: true },
    status: { type: String, enum: Object.values(shared_1.PaymentStatus), default: shared_1.PaymentStatus.PENDING, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    gatewayOrderId: { type: String, index: true },
    gatewayPaymentId: { type: String, index: true },
    gatewaySignature: String,
    paidAt: Date,
    failedAt: Date,
    failureReason: String,
}, { timestamps: true });
paymentSchema.index({ bookingId: 1, createdAt: -1 });
exports.Payment = (0, mongoose_1.model)('Payment', paymentSchema);
//# sourceMappingURL=payment.schema.js.map