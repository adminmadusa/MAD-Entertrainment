import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const ticketTierSchema = z.enum([
  "general",
  "silver",
  "gold",
  "vip",
  "vvip",
  "platinum",
  "backstage",
  "couple",
  "group",
  "family",
  "early_bird",
  "custom",
]);

const offerRulesSchema = z.object({
  discountType: z.enum(["percentage", "flat", "none"]),
  discountValue: z.number().min(0),
  minQtyRequired: z.number().int().min(1),
  buyQty: z.number().int().min(1).optional(),
  freeTicketQty: z.number().int().min(1).optional(),
});

const ticketConfigResponseSchema = z.object({
  tier: ticketTierSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  isFree: z.boolean(),
  totalCapacity: z.number().int().min(1),
  minPerBooking: z.number().int().min(1),
  maxPerBooking: z.number().int().min(1),
  groupSize: z.number().int().min(1),
  availabilityWindow: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
  offerRules: offerRulesSchema.optional(),
  isActive: z.boolean(),
});

const ticketGroupResponseSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  tickets: z.array(ticketConfigResponseSchema).default([]),
});

export const TicketProfileResponseSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  groups: z.array(ticketGroupResponseSchema).default([]),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TicketProfileListResponseSchema = z.object({
  profiles: z.array(TicketProfileResponseSchema),
});

export type TicketProfileResponse = z.infer<typeof TicketProfileResponseSchema>;
export type TicketProfileListResponse = z.infer<
  typeof TicketProfileListResponseSchema
>;
