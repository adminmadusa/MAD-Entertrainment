import { z } from "zod";

const bookingModeSchema = z.enum(["seat_based", "general_admission"]);
const eventStatusSchema = z.enum([
  "draft",
  "published",
  "cancelled",
  "postponed",
  "completed",
  "sold_out",
]);
const ticketTierSchemaEnum = z.enum([
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

const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  alt: z.string().optional(),
});

const ticketTierSchema = z.object({
  tier: ticketTierSchemaEnum,
  name: z.string().min(1),
  slug: z.string().min(1),
  price: z.number().min(0),
  capacity: z.number().int().min(0),
  totalCapacity: z.number().int().min(0),
  groupSize: z.number().int().min(1),
  minPerBooking: z.number().int().min(1),
  discount: z.number().min(0),
  taxPercent: z.number().min(0).max(100),
  isAvailable: z.boolean(),
});

const ticketOverrideSchema = z.object({
  tier: z.string().min(1),
  price: z.number().min(0).optional(),
  totalCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  maxPerBooking: z.number().int().min(1).optional(),
  minPerBooking: z.number().int().min(1).optional(),
});

export const EventMutationSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  description: z.string().min(1).max(5000),
  category: z.string().min(1),
  status: eventStatusSchema.optional(),
  bookingMode: bookingModeSchema,
  bannerImage: cloudinaryImageSchema,
  coverImage: cloudinaryImageSchema.optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  showTime: z.string().optional(),
  venue: z.string().min(1),
  isFeatured: z.boolean().optional(),
  isAgeRestricted: z.boolean().optional(),
  minimumAge: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  refundPolicy: z.string().max(1000).optional(),
  organizerName: z.string().max(100).optional(),
  totalCapacity: z.number().int().min(1).optional(),
  ticketProfileId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .nullable()
    .optional(),
  ticketOverrides: z.array(ticketOverrideSchema).optional(),
  ticketTiers: z.array(ticketTierSchema).optional(),
});

export type EventMutationInput = z.infer<typeof EventMutationSchema>;
