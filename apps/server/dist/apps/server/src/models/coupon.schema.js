"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
const shared_1 = require("@mad/shared");
const mongoose_1 = require("mongoose");
const couponSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    description: String,
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: Number,
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    applicableEventIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Event' }],
    applicableCategories: [{ type: String, enum: Object.values(shared_1.EventCategory) }],
}, { timestamps: true });
couponSchema.index({ isActive: 1, validUntil: 1 });
exports.Coupon = (0, mongoose_1.model)('Coupon', couponSchema);
//# sourceMappingURL=coupon.schema.js.map