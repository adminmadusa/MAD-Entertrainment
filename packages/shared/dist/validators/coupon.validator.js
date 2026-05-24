import { z } from 'zod';
import { EventCategory } from '../constants';
const baseCouponSchema = z.object({
    code: z
        .string()
        .min(3, 'Coupon code must be at least 3 characters')
        .max(30, 'Coupon code cannot exceed 30 characters')
        .regex(/^[A-Za-z0-9-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
        .transform((val) => val.toUpperCase()),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0, 'Discount value must be non-negative'),
    maxDiscount: z.number().min(0).nullable().optional(),
    minOrderAmount: z.number().min(0).default(0),
    usageLimit: z.number().int().min(1, 'Usage limit must be at least 1'),
    validFrom: z.coerce.date({ required_error: 'Validity start date is required' }),
    validUntil: z.coerce.date({ required_error: 'Validity end date is required' }),
    applicableEventIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Event ID')).nullable().optional(),
    applicableCategories: z.array(z.nativeEnum(EventCategory)).nullable().optional(),
    isActive: z.boolean().default(true),
});
export const createCouponSchema = baseCouponSchema
    .refine((data) => data.validUntil >= data.validFrom, { message: 'End date must be after or equal to start date', path: ['validUntil'] })
    .refine((data) => {
    if (data.discountType === 'percentage') {
        return data.discountValue <= 100;
    }
    return true;
}, { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] });
const partialCouponSchema = baseCouponSchema.partial();
export const updateCouponSchema = partialCouponSchema
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