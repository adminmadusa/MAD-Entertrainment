import { FormField, FormSection } from "@/components/forms/primitives";
import { COUPON_INPUT_CLASSNAME } from "@/components/forms/CouponForm/constants/coupon-form.constants";
import { CouponFormValues } from "@/types/coupon-form";

interface CouponScheduleSectionProps {
  values: CouponFormValues;
  onFieldChange: <K extends keyof CouponFormValues>(
    field: K,
    value: CouponFormValues[K],
  ) => void;
}

export function CouponScheduleSection({
  values,
  onFieldChange,
}: CouponScheduleSectionProps) {
  return (
    <FormSection title="Validity Window">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valid From *">
          <input
            id="coupon-valid-from"
            type="datetime-local"
            value={values.validFrom}
            onChange={(e) => onFieldChange("validFrom", e.target.value)}
            required
            className={COUPON_INPUT_CLASSNAME}
          />
        </FormField>

        <FormField label="Valid Until *">
          <input
            id="coupon-valid-until"
            type="datetime-local"
            value={values.validUntil}
            onChange={(e) => onFieldChange("validUntil", e.target.value)}
            required
            className={COUPON_INPUT_CLASSNAME}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
