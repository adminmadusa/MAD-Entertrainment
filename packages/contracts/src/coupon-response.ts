import { z } from "zod";

const eventCategorySchema = z.enum([
  "mad_event",
  "dj_night",
  "concert",
  "festival",
  "comedy",
  "celebrity",
  "theatre",
  "cinema",
  "vip_event",
  "live_show",
]);

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const CouponResponseSchema = z.object({
  _id: objectIdSchema,
  code: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed", "free_ticket"]),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  minOrderAmount: z.number().min(0),
  usageLimit: z.number().int().min(1),
  usedCount: z.number().int().min(0),
  isActive: z.boolean(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  applicableEventIds: z.array(objectIdSchema).default([]),
  applicableCategories: z.array(eventCategorySchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CouponListResponseSchema = z.object({
  coupons: z.array(CouponResponseSchema),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});

export type CouponResponse = z.infer<typeof CouponResponseSchema>;
export type CouponListResponse = z.infer<typeof CouponListResponseSchema>;
