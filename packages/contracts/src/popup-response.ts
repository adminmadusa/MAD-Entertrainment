import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const PopupImageResponseSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  alt: z.string().optional(),
});

export const PopupLinkedEventResponseSchema = z.object({
  eventId: objectIdSchema.optional(),
  showCountdown: z.boolean().optional(),
  earlyBirdDeadline: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  title: z.string().optional(),
  soldCount: z.number().int().min(0).optional(),
  totalCapacity: z.number().int().min(0).optional(),
});

export const PopupResponseSchema = z.object({
  _id: objectIdSchema,
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  image: PopupImageResponseSchema.optional(),
  ctaUrl: z.string().url().optional(),
  ctaText: z.string().optional(),
  trigger: z.enum(["on_load", "after_delay", "on_exit", "on_scroll"]),
  triggerDelay: z.number().int().min(0),
  cooldownHours: z.number().int().min(0),
  priority: z.number().int().min(0),
  showOnPages: z.array(z.string()).default([]),
  isActive: z.boolean(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  linkedEventId: objectIdSchema.optional(),
  linkedEvent: PopupLinkedEventResponseSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PopupListResponseSchema = z.object({
  popups: z.array(PopupResponseSchema),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1).optional(),
});

export type PopupResponse = z.infer<typeof PopupResponseSchema>;
export type PopupListResponse = z.infer<typeof PopupListResponseSchema>;
