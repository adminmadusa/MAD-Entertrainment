import { FormField, FormSection } from '@/components/forms/primitives';
import { COUPON_INPUT_CLASSNAME } from '@/components/forms/CouponForm/constants/coupon-form.constants';
import { CouponFormValues } from '@/types/coupon-form';

interface CouponLimitsSectionProps {
  values: CouponFormValues;
  onFieldChange: <K extends keyof CouponFormValues>(field: K, value: CouponFormValues[K]) => void;
}

export function CouponLimitsSection({ values, onFieldChange }: CouponLimitsSectionProps) {
  return (
    <FormSection title="Usage Rules">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Min Order Amount (₹)">
          <input
            type="number"
            min="0"
            value={values.minOrderAmount}
            onChange={(e) => onFieldChange('minOrderAmount', e.target.value === '' ? '' : Number(e.target.value))}
            className={COUPON_INPUT_CLASSNAME}
          />
        </FormField>

        <FormField label="Usage Limit (Total times redeemable)">
          <input
            type="number"
            min="1"
            value={values.usageLimit}
            onChange={(e) => onFieldChange('usageLimit', e.target.value === '' ? '' : Number(e.target.value))}
            required
            className={COUPON_INPUT_CLASSNAME}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
