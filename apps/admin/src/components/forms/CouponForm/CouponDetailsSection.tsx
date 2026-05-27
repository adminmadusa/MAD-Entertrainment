import { FormField, FormSection } from "@/components/forms/primitives";
import { COUPON_INPUT_CLASSNAME } from "@/components/forms/CouponForm/constants/coupon-form.constants";
import { CouponFormValues } from "@/types/coupon-form";

interface CouponDetailsSectionProps {
  values: CouponFormValues;
  onFieldChange: <K extends keyof CouponFormValues>(
    field: K,
    value: CouponFormValues[K],
  ) => void;
}

export function CouponDetailsSection({
  values,
  onFieldChange,
}: CouponDetailsSectionProps) {
  return (
    <FormSection title="General Details">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Coupon Code *">
          <input
            id="coupon-code"
            value={values.code}
            onChange={(e) => onFieldChange("code", e.target.value)}
            placeholder="e.g. SUMMER50"
            required
            className={`${COUPON_INPUT_CLASSNAME} font-mono uppercase`}
          />
        </FormField>

        <FormField label="Discount Type">
          <select
            id="coupon-discount-type"
            value={values.discountType}
            onChange={(e) =>
              onFieldChange(
                "discountType",
                e.target.value as CouponFormValues["discountType"],
              )
            }
            className={COUPON_INPUT_CLASSNAME}
          >
            <option value="percentage" className="bg-background-card">
              Percentage (%)
            </option>
            <option value="fixed" className="bg-background-card">
              Fixed Amount (₹)
            </option>
            <option value="free_ticket" className="bg-background-card">
              Free Ticket
            </option>
          </select>
        </FormField>
      </div>

      <FormField label="Description (optional)">
        <textarea
          id="coupon-description"
          value={values.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          placeholder="e.g. 15% discount up to ₹500 on all festival tickets"
          rows={3}
          className={`${COUPON_INPUT_CLASSNAME} resize-none`}
        />
      </FormField>
    </FormSection>
  );
}
