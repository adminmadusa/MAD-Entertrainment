import { EventCategory } from "@mad/shared";
import { z } from "zod";

import { validateDateRange } from "../forms/scheduling";
import { validateTargetingRules } from "../forms/targeting";
import { isPercentageInRange, isPositiveNumber } from "../forms/rules";

const numberOrEmpty = z.union([z.number(), z.literal("")]);

export const couponFormSchema = z
  .object({
    code: z.string().trim().min(1, "Coupon code is required."),
    description: z.string(),
    discountType: z.enum(["percentage", "fixed", "free_ticket"]),
    discountValue: numberOrEmpty,
    maxDiscount: numberOrEmpty,
    minOrderAmount: numberOrEmpty,
    usageLimit: numberOrEmpty,
    validFrom: z.string().min(1, "Validity start date is required."),
    validUntil: z.string().min(1, "Validity end date is required."),
    isActive: z.boolean(),
    applicableEventIds: z.array(z.string()),
    applicableCategories: z.array(z.nativeEnum(EventCategory)),
  })
  .superRefine((values, ctx) => {
    if (!isPositiveNumber(values.usageLimit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usageLimit"],
        message: "Usage limit must be at least 1.",
      });
    }

    if (!validateDateRange(values.validFrom, values.validUntil)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "End date must be after or equal to start date.",
      });
    }

    if (
      values.discountType === "percentage" &&
      !isPercentageInRange(values.discountValue)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Percentage discount must be between 1 and 100.",
      });
    }

    if (
      values.discountType === "fixed" &&
      !isPositiveNumber(values.discountValue)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Fixed discount amount must be greater than 0.",
      });
    }

    if (
      values.maxDiscount !== "" &&
      typeof values.maxDiscount === "number" &&
      values.maxDiscount < 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxDiscount"],
        message: "Max discount cannot be negative.",
      });
    }

    if (
      values.minOrderAmount !== "" &&
      typeof values.minOrderAmount === "number" &&
      values.minOrderAmount < 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minOrderAmount"],
        message: "Min order amount cannot be negative.",
      });
    }

    if (
      !validateTargetingRules({
        eventIds: values.applicableEventIds,
        categories: values.applicableCategories,
      })
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicableEventIds"],
        message: "Invalid targeting rules.",
      });
    }
  });
