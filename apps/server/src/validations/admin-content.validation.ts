import { z } from 'zod';
import { EventCategory, BookingMode, EventStatus, TicketTier } from '@mad/shared';

// -- Common schemas --
const cloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
});

// -- Venue Validation --
export const createVenueSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    address: z.string().optional(),
    capacity: z.number().int().min(0).optional(),
  }),
});

export const updateVenueSchema = z.object({
  params: z.object({ id: z.string() }),
  body: createVenueSchema.shape.body.partial(),
});

// -- Artist Validation --
export const createArtistSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    bio: z.string().max(3000).optional(),
    genre: z.array(z.string()).optional(),
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

export const updateArtistSchema = z.object({
  params: z.object({ id: z.string() }),
  body: createArtistSchema.shape.body.partial(),
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
    category: z.nativeEnum(EventCategory),
    status: z.nativeEnum(EventStatus).optional(),
    bookingMode: z.nativeEnum(BookingMode),
    bannerImage: cloudinaryImageSchema,
    posterImage: cloudinaryImageSchema.optional(),
    galleryImages: z.array(cloudinaryImageSchema).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    doorsOpenTime: z.string().optional(),
    showTime: z.string(),
    venueId: z.string(),
    onlineStreamUrl: z.string().url().optional(),
    isOnline: z.boolean().optional(),
    artistIds: z.array(z.string()).optional(),
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
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ id: z.string() }),
  body: createEventSchema.shape.body.partial(),
});
