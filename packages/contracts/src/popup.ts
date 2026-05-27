import { z } from "zod";

const popupImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  alt: z.string().optional(),
});

const popupTriggerSchema = z.enum([
  "on_load",
  "after_delay",
  "on_exit",
  "on_scroll",
]);
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const PopupMutationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  ctaText: z.string().max(200).optional(),
  ctaUrl: z.string().url().optional(),
  trigger: popupTriggerSchema,
  triggerDelay: z.number().int().min(0),
  cooldownHours: z.number().int().min(0),
  priority: z.number().int().min(0),
  isActive: z.boolean(),
  showOnPages: z.array(z.string().trim().min(1)).optional(),
  linkedEventId: objectIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  image: popupImageSchema.optional(),
});

export type PopupMutationInput = z.infer<typeof PopupMutationSchema>;
