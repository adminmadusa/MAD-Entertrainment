import { z } from 'zod';
const cloudinaryImageSchema = z.object({
    url: z.string().url('Image URL must be valid'),
    publicId: z.string().min(1, 'Public ID is required'),
    alt: z.string().optional(),
});
export const createDJSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    slug: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens')
        .optional(),
    bio: z.string().max(2000, 'Bio cannot exceed 2000 characters').optional(),
    specialties: z.array(z.string()).min(1, 'At least one specialty is required').max(10).optional(),
    profileImage: cloudinaryImageSchema.nullable().optional(),
    galleryImages: z.array(cloudinaryImageSchema).max(10).nullable().optional(),
    socialLinks: z
        .object({
        instagram: z.string().url('Instagram link must be a valid URL').optional().or(z.literal('')),
        soundcloud: z.string().url('SoundCloud link must be a valid URL').optional().or(z.literal('')),
        youtube: z.string().url('YouTube link must be a valid URL').optional().or(z.literal('')),
    })
        .nullable()
        .optional(),
    isActive: z.boolean().default(true),
});
export const updateDJSchema = createDJSchema.partial();
//# sourceMappingURL=dj.validator.js.map