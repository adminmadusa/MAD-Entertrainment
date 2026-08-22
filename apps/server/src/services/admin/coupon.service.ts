import { Types } from 'mongoose';

import { Coupon, ICoupon } from '../../models/coupon.schema';

export const createCoupon = async (data: Partial<ICoupon>): Promise<ICoupon> => {
  const coupon = new Coupon(data);
  return await coupon.save();
};

export const getCoupons = async (
  page: number = 1,
  limit: number = 15,
  active?: string
): Promise<{ coupons: ICoupon[]; total: number; totalPages: number }> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;
  const filter: Record<string, any> = {};

  if (active !== undefined && active !== '') {
    filter.isActive = String(active) === 'true';
  }

  const total = await Coupon.countDocuments(filter);
  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit);

  return {
    coupons,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
};

export const getCouponById = async (id: string): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  return await Coupon.findById(cleanId);
};

export const updateCoupon = async (id: string, data: Partial<ICoupon>): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;

  const updateFields: Partial<ICoupon> = {};
  if (data.code !== undefined) updateFields.code = String(data.code).trim().toUpperCase();
  if (data.discountType !== undefined) updateFields.discountType = data.discountType;
  if (data.discountValue !== undefined) updateFields.discountValue = Number(data.discountValue);
  if (data.maxDiscount !== undefined) updateFields.maxDiscount = Number(data.maxDiscount);
  if (data.minOrderAmount !== undefined) updateFields.minOrderAmount = Number(data.minOrderAmount);
  if (data.validFrom !== undefined) updateFields.validFrom = new Date(data.validFrom);
  if (data.validUntil !== undefined) updateFields.validUntil = new Date(data.validUntil);
  if (data.usageLimit !== undefined) updateFields.usageLimit = Number(data.usageLimit);
  if (data.usedCount !== undefined) updateFields.usedCount = Number(data.usedCount);
  if (data.isActive !== undefined) updateFields.isActive = Boolean(data.isActive);
  if (data.applicableEventIds !== undefined) updateFields.applicableEventIds = data.applicableEventIds;
  if (data.applicableCategories !== undefined) updateFields.applicableCategories = data.applicableCategories;

  return await Coupon.findByIdAndUpdate(cleanId, { $set: updateFields }, { new: true });
};

export const deleteCoupon = async (id: string): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  return await Coupon.findByIdAndDelete(cleanId);
};

export const toggleCoupon = async (id: string): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId || !Types.ObjectId.isValid(cleanId)) return null;
  const coupon = await Coupon.findById(cleanId);
  if (!coupon) {
    return null;
  }
  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};
