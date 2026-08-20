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
  if (!cleanId) return null;
  return await Coupon.findById(cleanId);
};

export const updateCoupon = async (id: string, data: Partial<ICoupon>): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  return await Coupon.findByIdAndUpdate(cleanId, data, { new: true });
};

export const deleteCoupon = async (id: string): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  return await Coupon.findByIdAndDelete(cleanId);
};

export const toggleCoupon = async (id: string): Promise<ICoupon | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  const coupon = await Coupon.findById(cleanId);
  if (!coupon) {
    return null;
  }
  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};
