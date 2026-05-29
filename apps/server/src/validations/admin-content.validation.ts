import { z } from 'zod';
import { EventCategory, BookingMode, EventStatus, TicketTier } from '@mad/shared';

// -- Common schemas --
const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
});


// -- DJ Operator Validation --
export const createDJOperatorSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    bio: z.string().max(3000).optional(),
    specialties: z.array(z.string()).optional(),
    profileImage: cloudinaryImageSchema.optional(),
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
  params: z.object({ id: z.string() }),
  body: createDJOperatorSchema.shape.body.partial(),
});

// -- Event Validation --
export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    slug: z.string().min(1),
    description: z.string().min(1).max(5000),
    category: z.string().min(1),
    status: z.nativeEnum(EventStatus).optional(),
    bookingMode: z.nativeEnum(BookingMode),
    bannerImage: cloudinaryImageSchema,
    posterImage: cloudinaryImageSchema.optional(),
    galleryImages: z.array(cloudinaryImageSchema).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    doorsOpenTime: z.string().optional(),
    showTime: z.string(),
    venue: z.string().min(1),
    onlineStreamUrl: z.string().url().optional(),
    isOnline: z.boolean().optional(),
    djOperatorIds: z.array(z.string()).optional(),
    ticketTiers: z
      .array(
        z.object({
          tier: z.nativeEnum(TicketTier),
          name: z.string(),
          slug: z.string().optional(),
          price: z.number().min(0),
          totalCapacity: z.number().int().min(1),
          groupSize: z.number().int().min(1).optional(),
          minPerBooking: z.number().int().min(1).optional(),
          maxPerBooking: z.number().int().min(1).optional(),
          description: z.string().optional(),
          perks: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          discount: z.number().min(0).optional(),
          taxPercent: z.number().min(0).max(100).optional(),
          availabilityWindow: z
            .object({
              startDate: z.string().datetime(),
              endDate: z.string().datetime(),
            })
            .optional(),
          isActive: z.boolean().optional(),
        })
      )
      .optional(),
    totalCapacity: z.number().int().min(1),
    isFeatured: z.boolean().optional(),
    seatLayoutId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    ageRestriction: z.number().int().min(0).optional(),
    dresscode: z.string().optional(),
    additionalInfo: z.string().optional(),
    showCountdown: z.boolean().optional(),
    isEarlyBird: z.boolean().optional(),
    earlyBirdDeadline: z.string().datetime().optional(),
    highlights: z.array(z.string()).optional(),
    refundPolicy: z.string().max(1000).optional(),
    organizerName: z.string().max(100).optional(),
    ticketProfileId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Mongoose ObjectId identifier').nullable().optional(),
    ticketOverrides: z.array(z.object({
      tier: z.string(),
      price: z.number().min(0).optional(),
      totalCapacity: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
      maxPerBooking: z.number().int().min(1).optional(),
      minPerBooking: z.number().int().min(1).optional(),
    })).optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string() }),
  body: createEventSchema.shape.body.partial(),
});

// -- Ticket Profile Validation --
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
  params: z.object({ id: z.string() }),
  body: createTicketProfileSchema.shape.body.partial(),
});
