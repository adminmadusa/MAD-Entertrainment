import { z } from 'zod';
const cloudinaryImageSchema = z.object({
    url: z.string().url('Image URL must be a valid URL'),
    publicId: z.string().min(1, 'Public ID is required'),
    alt: z.string().optional(),
});
const coordinatesSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});
export const createVenueSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    slug: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens')
        .optional(),
    description: z.string().max(2000).optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        pincode: z.string().min(4, 'Pincode must be at least 4 characters').max(10),
        country: z.string().default('India'),
        coordinates: coordinatesSchema.optional(),
    }),
    capacity: z.number().int().positive('Capacity must be a positive integer'),
    amenities: z.array(z.string()).max(30).optional(),
    images: z.array(cloudinaryImageSchema).max(10).default([]),
    contactEmail: z.string().email('Invalid contact email').optional().or(z.literal('')),
    contactPhone: z.string().min(10, 'Invalid contact phone').max(15).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
});
export const updateVenueSchema = createVenueSchema.partial();
//# sourceMappingURL=venue.validator.js.map