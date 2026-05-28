import { z } from "zod";

const eventStatusSchema = z.enum([
  "draft",
  "published",
  "cancelled",
  "postponed",
  "completed",
  "sold_out",
]);
const bookingModeSchema = z.enum(["seat_based", "general_admission"]);
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

export const CloudinaryImageResponseSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z.string().optional(),
});

const EventOfferRulesResponseSchema = z.object({
  discountType: z.enum(["percentage", "flat", "none"]),
  discountValue: z.number().min(0),
  minQtyRequired: z.number().int().min(1),
  buyQty: z.number().int().min(1).optional(),
  freeTicketQty: z.number().int().min(1).optional(),
});

export const EventTicketTierResponseSchema = z.object({
  tier: ticketTierSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().min(0),
  totalCapacity: z.number().int().min(0),
  soldCount: z.number().int().min(0),
  groupSize: z.number().int().min(1),
  minPerBooking: z.number().int().min(1),
  maxPerBooking: z.number().int().min(1),
  description: z.string().optional(),
  perks: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  discount: z.number().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  availabilityWindow: z
    .object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    })
    .optional(),
  isActive: z.boolean(),
  isFree: z.boolean(),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  offerRules: EventOfferRulesResponseSchema.optional(),
});

export const EventTicketOverrideResponseSchema = z.object({
  tier: z.string().min(1),
  price: z.number().min(0).optional(),
  totalCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  maxPerBooking: z.number().int().min(1).optional(),
  minPerBooking: z.number().int().min(1).optional(),
});

const EventRelationResponseSchema = z.object({
  _id: z.string().min(1),
  name: z.string().optional(),
  slug: z.string().optional(),
});

export const EventResponseSchema = z.object({
  _id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  status: eventStatusSchema,
  bookingMode: bookingModeSchema.optional(),
  bannerImage: CloudinaryImageResponseSchema.optional(),
  coverImage: CloudinaryImageResponseSchema.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  showTime: z.string().optional(),
  venue: z
    .string()
    .nullish()
  isFeatured: z.boolean(),
  isSoldOut: z.boolean(),
  isAgeRestricted: z.boolean().optional(),
  minimumAge: z.number().int().min(0).optional(),
  tags: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  refundPolicy: z.string().optional(),
  organizerName: z.string().optional(),
  totalCapacity: z.number().int().min(0),
  soldCount: z.number().int().min(0),
  ticketProfileId: z.string().min(1).optional(),
  ticketOverrides: z.array(EventTicketOverrideResponseSchema).default([]),
  ticketTiers: z.array(EventTicketTierResponseSchema).default([]),
  artistIds: z.array(EventRelationResponseSchema).default([]),
  djOperatorIds: z.array(EventRelationResponseSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EventListResponseSchema = z.object({
  events: z.array(EventResponseSchema),
  total: z.number().int().min(0),
  pages: z.number().int().min(1).optional(),
});

export type EventResponse = z.infer<typeof EventResponseSchema>;
export type EventListResponse = z.infer<typeof EventListResponseSchema>;
