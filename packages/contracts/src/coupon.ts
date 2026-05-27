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

export const CouponMutationSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(100),
  description: z.string().max(1000).optional(),
  discountType: z.enum(["percentage", "fixed", "free_ticket"]),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  minOrderAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  isActive: z.boolean(),
  applicableEventIds: z.array(objectIdSchema).optional(),
  applicableCategories: z.array(eventCategorySchema).optional(),
});

export type CouponMutationInput = z.infer<typeof CouponMutationSchema>;
