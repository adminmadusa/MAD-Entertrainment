"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const transactionSchema = new mongoose_1.Schema({
    bookingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    paymentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    type: { type: String, enum: ['charge', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    gateway: { type: String, enum: Object.values(shared_1.PaymentGateway), required: true },
    gatewayTransactionId: { type: String, required: true, index: true },
    status: { type: String, enum: Object.values(shared_1.PaymentStatus), required: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
exports.Transaction = (0, mongoose_1.model)('Transaction', transactionSchema);
//# sourceMappingURL=transaction.schema.js.map