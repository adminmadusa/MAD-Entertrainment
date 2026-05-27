import { z } from 'zod';

import { validatePublishWindow } from '../forms/scheduling';
import { validateTargetingRules } from '../forms/targeting';
import { canPublish } from '../forms/visibility';

export const popupFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Campaign name is required.'),
    title: z.string().trim().min(1, 'Popup title is required.'),
    description: z.string(),
    ctaText: z.string(),
    ctaUrl: z.string(),
    trigger: z.enum(['on_load', 'after_delay', 'on_exit', 'on_scroll']),
    triggerDelay: z.union([z.number().min(0), z.literal('')]),
    cooldownHours: z.union([z.number().min(1), z.literal('')]),
    priority: z.union([z.number(), z.literal('')]),
    isActive: z.boolean(),
    showOnPages: z.string(),
    linkedEventId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    image: z
      .object({
        url: z.string(),
        publicId: z.string(),
        alt: z.string().optional(),
      })
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (!validatePublishWindow(values.startDate || undefined, values.endDate || undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after or equal to start date.',
      });
    }

    if (!canPublish(values.startDate || undefined, values.endDate || undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Invalid publish window.',
      });
    }

    if (values.ctaUrl && !/^https?:\/\//i.test(values.ctaUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ctaUrl'],
        message: 'CTA URL must start with http:// or https://',
      });
    }

    if (
      !validateTargetingRules({
        pages: values.showOnPages ? values.showOnPages.split(',').map((page) => page.trim()).filter(Boolean) : [],
      })
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['showOnPages'],
        message: 'Invalid targeting rules.',
      });
    }
  });
