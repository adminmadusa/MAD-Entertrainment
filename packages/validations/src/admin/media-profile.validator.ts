import { z } from 'zod';

import { TicketTier } from '@mad/shared';
import { adminIdParamSchema } from './operations.validator';

export const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  hash: z.string().optional(),
});

// ─── DJ Operator Validation ───────────────────────────────────────────────────
export const createDJOperatorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    bio: z.string().max(3000).optional(),
    specialties: z.array(z.string()).optional(),
    profileImage: cloudinaryImageSchema.optional(),
    galleryImages: z.array(cloudinaryImageSchema).optional(),
    experienceYears: z.number().int().min(0).optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDJOperatorSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: createDJOperatorSchema.shape.body.partial(),
});

// ─── Upload Deletion Validation ───────────────────────────────────────────────
export const deleteUploadSchema = z.object({
  body: z.object({
    publicId: z.string().min(1, 'publicId is required'),
  }).strict(),
});

// ─── Ticket Profile Validation ────────────────────────────────────────────────
const ticketOfferRulesSchema = z.object({
  discountType: z.enum(['percentage', 'flat', 'none']),
  discountValue: z.number().min(0),
  minQtyRequired: z.number().int().min(1),
  buyQty: z.number().int().min(1).optional(),
  freeTicketQty: z.number().int().min(1).optional(),
});

const ticketConfigSchema = z.object({
  tier: z.nativeEnum(TicketTier),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  isFree: z.boolean().optional(),
  totalCapacity: z.number().int().min(1),
  minPerBooking: z.number().int().min(1).optional(),
  maxPerBooking: z.number().int().min(1).optional(),
  groupSize: z.number().int().min(1).optional(),
  availabilityWindow: z.object({
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
  }).optional(),
  offerRules: ticketOfferRulesSchema.optional(),
  isActive: z.boolean().optional(),
});

const ticketGroupSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  tickets: z.array(ticketConfigSchema),
});

export const createTicketProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Profile name is required'),
    description: z.string().optional(),
    groups: z.array(ticketGroupSchema).default([]),
    isActive: z.boolean().optional(),
  }),
});

export const updateTicketProfileSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: createTicketProfileSchema.shape.body.partial(),
});
