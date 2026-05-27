import { EventCategory } from '@mad/shared';
import { Coupon } from '@mad/types';

export type CouponFormMode = 'create' | 'edit';

export type CouponDiscountType = 'percentage' | 'fixed' | 'free_ticket';

export interface CouponFormValues {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number | '';
  maxDiscount: number | '';
  minOrderAmount: number | '';
  usageLimit: number | '';
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  applicableEventIds: string[];
  applicableCategories: EventCategory[];
}

export type CouponMutationPayload = Partial<
  Pick<
    Coupon,
    | 'code'
    | 'description'
    | 'discountType'
    | 'discountValue'
    | 'maxDiscount'
    | 'minOrderAmount'
    | 'usageLimit'
    | 'validFrom'
    | 'validUntil'
    | 'isActive'
    | 'applicableEventIds'
    | 'applicableCategories'
  >
>;
