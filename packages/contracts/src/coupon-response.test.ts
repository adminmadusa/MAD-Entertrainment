import { describe, expect, it } from "vitest";
import { CouponResponseSchema } from "./coupon-response";

const baseCoupon = {
  _id: "507f1f77bcf86cd799439011",
  code: "SAVE20",
  discountType: "percentage",
  discountValue: 20,
  maxDiscount: 500,
  minOrderAmount: 1000,
  usageLimit: 100,
  usedCount: 10,
  isActive: true,
  validFrom: "2026-05-01T00:00:00.000Z",
  validUntil: "2026-06-01T00:00:00.000Z",
  applicableEventIds: [],
  applicableCategories: [],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("CouponResponseSchema", () => {
  it("accepts canonical coupon response payload", () => {
    expect(CouponResponseSchema.safeParse(baseCoupon).success).toBe(true);
  });

  it("allows absent eligibility targeting arrays", () => {
    const payload = {
      ...baseCoupon,
      applicableEventIds: undefined,
      applicableCategories: undefined,
    };
    expect(CouponResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("allows nullable maxDiscount and additive optional fields", () => {
    const payload = {
      ...baseCoupon,
      maxDiscount: null,
      description: "Public coupon",
      futureSafeField: true,
    };
    expect(CouponResponseSchema.safeParse(payload).success).toBe(true);
  });
});
