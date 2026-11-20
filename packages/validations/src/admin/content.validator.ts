import { z } from 'zod';

import { EventCategory, PopupTrigger } from '@mad/shared';
import { objectIdSchema } from '../common.validator';
import { adminIdParamSchema } from './operations.validator';

export const isoDateTimeSchema = z.string().datetime();

export const hasAtLeastOneField = (data: Record<string, unknown>) => Object.keys(data).length > 0;

export const strictCloudinaryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z.string().max(200).optional(),
}).strict();

export const optionalUrlSchema = z.union([z.string().trim().max(2048).url(), z.literal('')]).optional();

// ─── Coupon Validation ────────────────────────────────────────────────────────
const couponFieldsSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50).transform((value) => value.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  maxDiscount: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  validFrom: isoDateTimeSchema,
  validUntil: isoDateTimeSchema,
  usageLimit: z.number().int().min(1),
  isActive: z.boolean().optional(),
  applicableEventIds: z.array(objectIdSchema).optional(),
  applicableCategories: z.array(z.nativeEnum(EventCategory)).optional(),
}).strict();

const validateCouponRules = (data: Partial<z.infer<typeof couponFieldsSchema>>, ctx: z.RefinementCtx) => {
  if (data.discountType === 'percentage' && typeof data.discountValue === 'number' && data.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountValue'],
      message: 'Percentage discount cannot exceed 100',
    });
  }

  if (data.validFrom && data.validUntil && new Date(data.validUntil).getTime() < new Date(data.validFrom).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validUntil'],
      message: 'validUntil must be after validFrom',
    });
  }
};

export const createCouponSchema = z.object({
  body: couponFieldsSchema.superRefine(validateCouponRules),
});

export const updateCouponSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: couponFieldsSchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required')
    .superRefine(validateCouponRules),
});

// ─── Popup Validation ─────────────────────────────────────────────────────────
const popupLinkedEventSchema = z.object({
  eventId: objectIdSchema.optional(),
  showCountdown: z.boolean().optional(),
  earlyBirdDeadline: isoDateTimeSchema.optional(),
}).strict();

const popupFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Popup name is required').max(150),
  title: z.string().trim().min(1, 'Popup title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  image: strictCloudinaryImageSchema.optional(),
  ctaUrl: optionalUrlSchema,
  ctaText: z.string().trim().max(100).optional(),
  trigger: z.nativeEnum(PopupTrigger).default(PopupTrigger.ON_LOAD),
  triggerDelay: z.number().int().min(0).optional(),
  cooldownHours: z.number().int().min(0).optional(),
  priority: z.number().int().min(0).optional(),
  showOnPages: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  isActive: z.boolean().optional(),
  startDate: isoDateTimeSchema.optional(),
  endDate: isoDateTimeSchema.optional(),
  linkedEventId: objectIdSchema.optional(),
  linkedEvent: popupLinkedEventSchema.optional(),
}).strict();

const validatePopupDateRange = (data: Partial<z.infer<typeof popupFieldsSchema>>, ctx: z.RefinementCtx) => {
  if (data.startDate && data.endDate && new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'endDate must be after startDate',
    });
  }
};

export const createPopupSchema = z.object({
  body: popupFieldsSchema.superRefine(validatePopupDateRange),
});

export const updatePopupSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: popupFieldsSchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required')
    .superRefine(validatePopupDateRange),
});

// ─── Category Validation ──────────────────────────────────────────────────────
const categoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
}).strict();

export const createCategorySchema = z.object({
  body: categoryBodySchema,
});

export const updateCategorySchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: categoryBodySchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required'),
});

// ─── Tier Validation ──────────────────────────────────────────────────────────
const tierBodySchema = z.object({
  name: z.string().trim().min(1, 'Tier name is required').max(100),
  icon: z.enum(['ticket', 'star', 'medal', 'crown', 'lock', 'users', 'heart', 'clock', 'gift']).optional(),
  color: z.string().trim().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format').optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  defaultVisibility: z.boolean().optional(),
  sortIndex: z.number().int().min(0).optional(),
}).strict();

export const createTierSchema = z.object({
  body: tierBodySchema,
});

export const updateTierSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: tierBodySchema
    .partial()
    .refine(hasAtLeastOneField, 'At least one field is required'),
});
