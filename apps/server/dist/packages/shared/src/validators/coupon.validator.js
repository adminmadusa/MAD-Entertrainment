"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCouponSchema = exports.createCouponSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const baseCouponSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .min(3, 'Coupon code must be at least 3 characters')
        .max(30, 'Coupon code cannot exceed 30 characters')
        .regex(/^[A-Za-z0-9-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
        .transform((val) => val.toUpperCase()),
    description: zod_1.z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    discountType: zod_1.z.enum(['percentage', 'fixed']),
    discountValue: zod_1.z.number().min(0, 'Discount value must be non-negative'),
    maxDiscount: zod_1.z.number().min(0).nullable().optional(),
    minOrderAmount: zod_1.z.number().min(0).default(0),
    usageLimit: zod_1.z.number().int().min(1, 'Usage limit must be at least 1'),
    validFrom: zod_1.z.coerce.date({ required_error: 'Validity start date is required' }),
    validUntil: zod_1.z.coerce.date({ required_error: 'Validity end date is required' }),
    applicableEventIds: zod_1.z.array(zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Event ID')).nullable().optional(),
    applicableCategories: zod_1.z.array(zod_1.z.nativeEnum(constants_1.EventCategory)).nullable().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.createCouponSchema = baseCouponSchema
    .refine((data) => data.validUntil >= data.validFrom, { message: 'End date must be after or equal to start date', path: ['validUntil'] })
    .refine((data) => {
    if (data.discountType === 'percentage') {
        return data.discountValue <= 100;
    }
    return true;
}, { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] });
const partialCouponSchema = baseCouponSchema.partial();
exports.updateCouponSchema = partialCouponSchema
    .refine((data) => {
    if (data.validFrom && data.validUntil) {
        return data.validUntil >= data.validFrom;
    }
    return true;
}, { message: 'End date must be after or equal to start date', path: ['validUntil'] })
    .refine((data) => {
    if (data.discountType === 'percentage' && data.discountValue !== undefined) {
        return data.discountValue <= 100;
    }
    return true;
}, { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] });
//# sourceMappingURL=coupon.validator.js.map