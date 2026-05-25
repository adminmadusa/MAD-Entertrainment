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
  const skip = (page - 1) * limit;
  const filter: Record<string, any> = {};

  if (active !== undefined && active !== '') {
    filter.isActive = active === 'true';
  }

  const total = await Coupon.countDocuments(filter);
  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    coupons,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const getCouponById = async (id: string): Promise<ICoupon | null> => {
  return await Coupon.findById(id);
};

export const updateCoupon = async (id: string, data: Partial<ICoupon>): Promise<ICoupon | null> => {
  return await Coupon.findByIdAndUpdate(id, data, { new: true });
};

export const deleteCoupon = async (id: string): Promise<ICoupon | null> => {
  return await Coupon.findByIdAndDelete(id);
};

export const toggleCoupon = async (id: string): Promise<ICoupon | null> => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    return null;
  }
  coupon.isActive = !coupon.isActive;
  return await coupon.save();
};
