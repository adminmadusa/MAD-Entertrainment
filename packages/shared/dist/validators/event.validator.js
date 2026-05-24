import { z } from 'zod';
import { EventCategory, EventMode, EventStatus, TicketTier } from '../constants';
const cloudinaryImageSchema = z.object({
    url: z.string().url('Image URL must be a valid URL'),
    publicId: z.string().min(1, 'publicId is required'),
    alt: z.string().optional(),
});
const ticketTierSchema = z.object({
    name: z.nativeEnum(TicketTier),
    price: z.number().min(0, 'Price must be non-negative'),
    capacity: z.number().int().positive('Capacity must be a positive integer'),
    description: z.string().optional(),
    perks: z.array(z.string()).optional(),
    isAvailable: z.boolean().default(true),
});
export const createEventSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    slug: z
        .string()
        .min(3)
        .max(200)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
        .optional(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
    shortDescription: z.string().max(300).optional(),
    category: z.nativeEnum(EventCategory),
    mode: z.nativeEnum(EventMode).default(EventMode.LIVE),
    status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
    coverImage: cloudinaryImageSchema.optional(),
    gallery: z.array(cloudinaryImageSchema).max(10).optional(),
    venueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid venue ID').optional(),
    artistIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    djOperatorIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    startDate: z.coerce.date({ required_error: 'Start date is required' }),
    endDate: z.coerce.date().optional(),
    doorsOpen: z.coerce.date().optional(),
    ticketTiers: z.array(ticketTierSchema).min(1, 'At least one ticket tier is required'),
    totalCapacity: z.number().int().positive().optional(),
    isFeatured: z.boolean().default(false),
    isAgeRestricted: z.boolean().default(false),
    minimumAge: z.number().int().min(0).max(21).optional(),
    tags: z.array(z.string()).max(20).optional(),
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, { message: 'End date must be after start date', path: ['endDate'] });
export const updateEventSchema = createEventSchema._def.schema.partial();
//# sourceMappingURL=event.validator.js.map