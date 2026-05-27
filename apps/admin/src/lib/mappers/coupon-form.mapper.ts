import { Coupon } from '@mad/types';

import { toIsoDateTime, toLocalDateTimeInput } from '../forms/scheduling';
import { CouponFormValues, CouponMutationPayload } from '@/types/coupon-form';

export function toLocalDatetimeString(dateStr: Date | string | undefined): string {
  return toLocalDateTimeInput(dateStr);
}

export function getDefaultCouponFormValues(): CouponFormValues {
  return {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    maxDiscount: '',
    minOrderAmount: '',
    usageLimit: 100,
    validFrom: '',
    validUntil: '',
    isActive: true,
    applicableEventIds: [],
    applicableCategories: [],
  };
}

export function mapCouponToFormValues(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code || '',
    description: coupon.description || '',
    discountType: coupon.discountType || 'percentage',
    discountValue: coupon.discountValue ?? '',
    maxDiscount: coupon.maxDiscount ?? '',
    minOrderAmount: coupon.minOrderAmount ?? '',
    usageLimit: coupon.usageLimit ?? 100,
    validFrom: toLocalDatetimeString(coupon.validFrom),
    validUntil: toLocalDatetimeString(coupon.validUntil),
    isActive: coupon.isActive ?? true,
    applicableEventIds: coupon.applicableEventIds || [],
    applicableCategories: coupon.applicableCategories || [],
  };
}

export function mapCouponFormToPayload(values: CouponFormValues): CouponMutationPayload {
  const maxDiscountValue = values.maxDiscount === '' ? undefined : Number(values.maxDiscount);

  return {
    code: values.code.trim().toUpperCase(),
    description: values.description.trim() || undefined,
    discountType: values.discountType,
    discountValue: Number(values.discountValue || 0),
    maxDiscount: values.discountType === 'fixed' ? null : maxDiscountValue,
    minOrderAmount: Number(values.minOrderAmount || 0),
    usageLimit: Number(values.usageLimit || 1),
    validFrom: toIsoDateTime(values.validFrom),
    validUntil: toIsoDateTime(values.validUntil),
    isActive: values.isActive,
    applicableEventIds: values.applicableEventIds.length > 0 ? values.applicableEventIds : [],
    applicableCategories: values.applicableCategories.length > 0 ? values.applicableCategories : [],
  };
}
