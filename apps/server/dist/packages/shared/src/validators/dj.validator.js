"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDJSchema = exports.createDJSchema = void 0;
const zod_1 = require("zod");
const cloudinaryImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('Image URL must be valid'),
    publicId: zod_1.z.string().min(1, 'Public ID is required'),
    alt: zod_1.z.string().optional(),
});
exports.createDJSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    slug: zod_1.z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens')
        .optional(),
    bio: zod_1.z.string().max(2000, 'Bio cannot exceed 2000 characters').optional(),
    specialties: zod_1.z.array(zod_1.z.string()).min(1, 'At least one specialty is required').max(10).optional(),
    profileImage: cloudinaryImageSchema.nullable().optional(),
    galleryImages: zod_1.z.array(cloudinaryImageSchema).max(10).nullable().optional(),
    socialLinks: zod_1.z
        .object({
        instagram: zod_1.z.string().url('Instagram link must be a valid URL').optional().or(zod_1.z.literal('')),
        soundcloud: zod_1.z.string().url('SoundCloud link must be a valid URL').optional().or(zod_1.z.literal('')),
        youtube: zod_1.z.string().url('YouTube link must be a valid URL').optional().or(zod_1.z.literal('')),
    })
        .nullable()
        .optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateDJSchema = exports.createDJSchema.partial();
//# sourceMappingURL=dj.validator.js.map