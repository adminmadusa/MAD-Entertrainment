import { Document, Types } from 'mongoose';
import { EventCategory } from '@mad/shared';
export interface ICoupon extends Document {
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscount?: number;
    minOrderAmount?: number;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    validFrom: Date;
    validUntil: Date;
    applicableEventIds?: Types.ObjectId[];
    applicableCategories?: EventCategory[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Coupon: import("mongoose").Model<ICoupon, {}, {}, {}, Document<unknown, {}, ICoupon, {}, {}> & ICoupon & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Coupon.model.d.ts.map