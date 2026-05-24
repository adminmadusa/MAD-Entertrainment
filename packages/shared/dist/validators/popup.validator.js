import { z } from 'zod';
import { PopupTrigger } from '../constants';
const cloudinaryImageSchema = z.object({
    url: z.string().url('Image URL must be valid'),
    publicId: z.string().min(1, 'Public ID is required'),
    alt: z.string().optional(),
});
export const createPopupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    image: cloudinaryImageSchema.nullable().optional(),
    ctaText: z.string().max(100).optional(),
    ctaUrl: z.string().url('CTA URL must be a valid URL').optional().or(z.literal('')),
    trigger: z.nativeEnum(PopupTrigger).default(PopupTrigger.ON_LOAD),
    triggerDelay: z.number().int().nonnegative().default(3000),
    cooldownHours: z.number().int().positive().default(24),
    isActive: z.boolean().default(true),
    showOnPages: z.array(z.string()).optional(),
    linkedEventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Event ID').optional().or(z.literal('')),
    startDate: z.string().datetime({ message: 'Invalid start date format' }).optional().or(z.literal('')),
    endDate: z.string().datetime({ message: 'Invalid end date format' }).optional().or(z.literal('')),
    priority: z.number().int().default(0),
});
export const updatePopupSchema = createPopupSchema.partial();
//# sourceMappingURL=popup.validator.js.map