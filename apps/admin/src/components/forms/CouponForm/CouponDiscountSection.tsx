import { FormField, FormSection } from "@/components/forms/primitives";
import { COUPON_INPUT_CLASSNAME } from "@/components/forms/CouponForm/constants/coupon-form.constants";
import { CouponFormValues } from "@/types/coupon-form";

interface CouponDiscountSectionProps {
  values: CouponFormValues;
  onFieldChange: <K extends keyof CouponFormValues>(
    field: K,
    value: CouponFormValues[K],
  ) => void;
}

export function CouponDiscountSection({
  values,
  onFieldChange,
}: CouponDiscountSectionProps) {
  return (
    <FormSection title="Discount Configuration">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label={
            values.discountType === "percentage"
              ? "Discount Percentage (%) *"
              : "Discount Amount (₹) *"
          }
        >
          <input
            id="coupon-discount-value"
            type="number"
            min="0"
            max={values.discountType === "percentage" ? "100" : undefined}
            value={values.discountValue}
            onChange={(e) =>
              onFieldChange(
                "discountValue",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            required
            className={COUPON_INPUT_CLASSNAME}
          />
        </FormField>

        <FormField label="Max Discount (₹, blank for unlimited)">
          <input
            id="coupon-max-discount"
            type="number"
            min="0"
            value={values.maxDiscount}
            onChange={(e) =>
              onFieldChange(
                "maxDiscount",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            disabled={values.discountType === "fixed"}
            placeholder={values.discountType === "fixed" ? "N/A" : "Unlimited"}
            className={`${COUPON_INPUT_CLASSNAME} disabled:opacity-40`}
          />
        </FormField>
      </div>
    </FormSection>
  );
}
