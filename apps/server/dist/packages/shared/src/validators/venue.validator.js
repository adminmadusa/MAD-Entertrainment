"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVenueSchema = exports.createVenueSchema = void 0;
const zod_1 = require("zod");
const cloudinaryImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('Image URL must be a valid URL'),
    publicId: zod_1.z.string().min(1, 'Public ID is required'),
    alt: zod_1.z.string().optional(),
});
const coordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
});
exports.createVenueSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    slug: zod_1.z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens')
        .optional(),
    description: zod_1.z.string().max(2000).optional(),
    address: zod_1.z.object({
        street: zod_1.z.string().optional(),
        city: zod_1.z.string().min(1, 'City is required'),
        state: zod_1.z.string().min(1, 'State is required'),
        pincode: zod_1.z.string().min(4, 'Pincode must be at least 4 characters').max(10),
        country: zod_1.z.string().default('India'),
        coordinates: coordinatesSchema.optional(),
    }),
    capacity: zod_1.z.number().int().positive('Capacity must be a positive integer'),
    amenities: zod_1.z.array(zod_1.z.string()).max(30).optional(),
    images: zod_1.z.array(cloudinaryImageSchema).max(10).default([]),
    contactEmail: zod_1.z.string().email('Invalid contact email').optional().or(zod_1.z.literal('')),
    contactPhone: zod_1.z.string().min(10, 'Invalid contact phone').max(15).optional().or(zod_1.z.literal('')),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateVenueSchema = exports.createVenueSchema.partial();
//# sourceMappingURL=venue.validator.js.map