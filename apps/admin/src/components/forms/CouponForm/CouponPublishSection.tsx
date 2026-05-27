import { FormSection } from '@/components/forms/primitives';
import { CouponFormValues } from '@/types/coupon-form';

interface CouponPublishSectionProps {
  values: CouponFormValues;
  onFieldChange: <K extends keyof CouponFormValues>(field: K, value: CouponFormValues[K]) => void;
}

export function CouponPublishSection({ values, onFieldChange }: CouponPublishSectionProps) {
  return (
    <FormSection title="Publish">
      <div className="flex items-center gap-3 cursor-pointer select-none py-1">
        <input
          type="checkbox"
          id="coupon-active"
          checked={values.isActive}
          onChange={(e) => onFieldChange('isActive', e.target.checked)}
          className="w-4 h-4 accent-accent-purple rounded"
        />
        <label htmlFor="coupon-active" className="text-text-secondary text-sm">
          Mark this coupon as active immediately
        </label>
      </div>
    </FormSection>
  );
}
