import { EventCategory } from "@mad/shared";
import { describe, expect, it } from "vitest";

import { couponFormSchema } from "./coupon-form.schema";

const validValues = {
  code: "SUMMER50",
  description: "Festival offer",
  discountType: "percentage" as const,
  discountValue: 20,
  maxDiscount: 500,
  minOrderAmount: 1000,
  usageLimit: 100,
  validFrom: "2026-10-10T18:00",
  validUntil: "2026-10-11T18:00",
  isActive: true,
  applicableEventIds: ["evt_1"],
  applicableCategories: [EventCategory.CONCERT],
};

describe("couponFormSchema", () => {
  it("accepts valid values", () => {
    expect(couponFormSchema.safeParse(validValues).success).toBe(true);
  });

  it("rejects percentage discount over 100", () => {
    const result = couponFormSchema.safeParse({
      ...validValues,
      discountValue: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date window", () => {
    const result = couponFormSchema.safeParse({
      ...validValues,
      validFrom: "2026-10-12T10:00",
      validUntil: "2026-10-11T10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects fixed discount that is not positive", () => {
    const result = couponFormSchema.safeParse({
      ...validValues,
      discountType: "fixed",
      discountValue: 0,
    });
    expect(result.success).toBe(false);
  });
});
