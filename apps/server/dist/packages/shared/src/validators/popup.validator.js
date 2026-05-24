"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePopupSchema = exports.createPopupSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../constants");
const cloudinaryImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('Image URL must be valid'),
    publicId: zod_1.z.string().min(1, 'Public ID is required'),
    alt: zod_1.z.string().optional(),
});
exports.createPopupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(200),
    title: zod_1.z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: zod_1.z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    image: cloudinaryImageSchema.nullable().optional(),
    ctaText: zod_1.z.string().max(100).optional(),
    ctaUrl: zod_1.z.string().url('CTA URL must be a valid URL').optional().or(zod_1.z.literal('')),
    trigger: zod_1.z.nativeEnum(constants_1.PopupTrigger).default(constants_1.PopupTrigger.ON_LOAD),
    triggerDelay: zod_1.z.number().int().nonnegative().default(3000),
    cooldownHours: zod_1.z.number().int().positive().default(24),
    isActive: zod_1.z.boolean().default(true),
    showOnPages: zod_1.z.array(zod_1.z.string()).optional(),
    linkedEventId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Event ID').optional().or(zod_1.z.literal('')),
    startDate: zod_1.z.string().datetime({ message: 'Invalid start date format' }).optional().or(zod_1.z.literal('')),
    endDate: zod_1.z.string().datetime({ message: 'Invalid end date format' }).optional().or(zod_1.z.literal('')),
    priority: zod_1.z.number().int().default(0),
});
exports.updatePopupSchema = exports.createPopupSchema.partial();
//# sourceMappingURL=popup.validator.js.map