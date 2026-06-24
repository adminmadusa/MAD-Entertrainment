import { EventCategory } from '@mad/shared';
import { Coupon } from '@mad/types';

export interface CouponFormState {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: string;
  minOrderAmount: number;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  selectedEvents: string[];
  selectedCategories: EventCategory[];
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MAD_EVENT]: 'MAD Event',
  [EventCategory.DJ_NIGHT]: 'DJ Night',
  [EventCategory.CONCERT]: 'Concert',
  [EventCategory.FESTIVAL]: 'Festival',
  [EventCategory.COMEDY]: 'Comedy Show',
  [EventCategory.CELEBRITY]: 'Celebrity Event',
  [EventCategory.THEATRE]: 'Theatre',
  [EventCategory.CINEMA]: 'Cinema',
  [EventCategory.VIP_EVENT]: 'VIP Event',
  [EventCategory.LIVE_SHOW]: 'Live Show',
};

export const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors';

export function defaultCouponForm(): CouponFormState {
  return {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxDiscount: '',
    minOrderAmount: 0,
    usageLimit: 100,
    validFrom: '',
    validUntil: '',
    isActive: true,
    selectedEvents: [],
    selectedCategories: [],
  };
}

export function toLocalDatetimeString(dateStr: Date | string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function mapCouponToFormState(coupon: Coupon | null | undefined): CouponFormState {
  if (!coupon) return defaultCouponForm();
  return {
    code: coupon.code || '',
    description: coupon.description || '',
    discountType: coupon.discountType || 'percentage',
    discountValue: coupon.discountValue || 0,
    maxDiscount: coupon.maxDiscount !== undefined && coupon.maxDiscount !== null ? String(coupon.maxDiscount) : '',
    minOrderAmount: coupon.minOrderAmount || 0,
    usageLimit: coupon.usageLimit || 100,
    validFrom: toLocalDatetimeString(coupon.validFrom),
    validUntil: toLocalDatetimeString(coupon.validUntil),
    isActive: coupon.isActive ?? true,
    selectedEvents: coupon.applicableEventIds || [],
    selectedCategories: coupon.applicableCategories || [],
  };
}

export function validateCouponForm(state: CouponFormState): string | null {
  if (!state.code.trim()) return 'Coupon code is required.';
  if (state.discountType === 'percentage' && state.discountValue > 100) {
    return 'Percentage discount cannot exceed 100%.';
  }
  if (!state.validFrom || !state.validUntil) {
    return 'Both validity start and end dates are required.';
  }
  if (new Date(state.validUntil) < new Date(state.validFrom)) {
    return 'End date must be after or equal to start date.';
  }
  return null;
}

export function buildCreateCouponPayload(state: CouponFormState): Partial<Coupon> {
  return {
    code: state.code.trim().toUpperCase(),
    description: state.description.trim() || undefined,
    discountType: state.discountType,
    discountValue: Number(state.discountValue),
    maxDiscount: state.maxDiscount ? Number(state.maxDiscount) : undefined,
    minOrderAmount: Number(state.minOrderAmount),
    usageLimit: Number(state.usageLimit),
    validFrom: new Date(state.validFrom).toISOString(),
    validUntil: new Date(state.validUntil).toISOString(),
    isActive: state.isActive,
    applicableEventIds: state.selectedEvents.length > 0 ? state.selectedEvents : undefined,
    applicableCategories: state.selectedCategories.length > 0 ? state.selectedCategories : undefined,
  };
}

export function buildUpdateCouponPayload(state: CouponFormState): Partial<Coupon> {
  return {
    code: state.code.trim().toUpperCase(),
    description: state.description.trim() || undefined,
    discountType: state.discountType,
    discountValue: Number(state.discountValue),
    maxDiscount: state.maxDiscount ? Number(state.maxDiscount) : null,
    minOrderAmount: Number(state.minOrderAmount),
    usageLimit: Number(state.usageLimit),
    validFrom: new Date(state.validFrom).toISOString(),
    validUntil: new Date(state.validUntil).toISOString(),
    isActive: state.isActive,
    applicableEventIds: state.selectedEvents.length > 0 ? state.selectedEvents : [],
    applicableCategories: state.selectedCategories.length > 0 ? state.selectedCategories : [],
  };
}
