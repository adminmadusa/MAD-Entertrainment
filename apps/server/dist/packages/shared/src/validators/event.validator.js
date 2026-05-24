"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const cloudinaryImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('Image URL must be a valid URL'),
    publicId: zod_1.z.string().min(1, 'publicId is required'),
    alt: zod_1.z.string().optional(),
});
const ticketTierSchema = zod_1.z.object({
    name: zod_1.z.nativeEnum(constants_1.TicketTier),
    price: zod_1.z.number().min(0, 'Price must be non-negative'),
    capacity: zod_1.z.number().int().positive('Capacity must be a positive integer'),
    description: zod_1.z.string().optional(),
    perks: zod_1.z.array(zod_1.z.string()).optional(),
    isAvailable: zod_1.z.boolean().default(true),
});
exports.createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(200),
    slug: zod_1.z
        .string()
        .min(3)
        .max(200)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
        .optional(),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters').max(5000),
    shortDescription: zod_1.z.string().max(300).optional(),
    category: zod_1.z.nativeEnum(constants_1.EventCategory),
    mode: zod_1.z.nativeEnum(constants_1.EventMode).default(constants_1.EventMode.LIVE),
    status: zod_1.z.nativeEnum(constants_1.EventStatus).default(constants_1.EventStatus.DRAFT),
    coverImage: cloudinaryImageSchema.optional(),
    gallery: zod_1.z.array(cloudinaryImageSchema).max(10).optional(),
    venueId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid venue ID').optional(),
    artistIds: zod_1.z.array(zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    djOperatorIds: zod_1.z.array(zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
    startDate: zod_1.z.coerce.date({ required_error: 'Start date is required' }),
    endDate: zod_1.z.coerce.date().optional(),
    doorsOpen: zod_1.z.coerce.date().optional(),
    ticketTiers: zod_1.z.array(ticketTierSchema).min(1, 'At least one ticket tier is required'),
    totalCapacity: zod_1.z.number().int().positive().optional(),
    isFeatured: zod_1.z.boolean().default(false),
    isAgeRestricted: zod_1.z.boolean().default(false),
    minimumAge: zod_1.z.number().int().min(0).max(21).optional(),
    tags: zod_1.z.array(zod_1.z.string()).max(20).optional(),
    seoTitle: zod_1.z.string().max(70).optional(),
    seoDescription: zod_1.z.string().max(160).optional(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, { message: 'End date must be after start date', path: ['endDate'] });
exports.updateEventSchema = exports.createEventSchema._def.schema.partial();
//# sourceMappingURL=event.validator.js.map