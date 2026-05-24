import { EventCategory } from '@mad/shared';
import { Document, model, Schema, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableEventIds?: Types.ObjectId[];
  applicableCategories?: EventCategory[];
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderAmount: { type: Number, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    applicableEventIds: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    applicableCategories: [{ type: String, enum: Object.values(EventCategory) }],
  },
  { timestamps: true }
);

export const Coupon = model<ICoupon>('Coupon', couponSchema);
