import { z } from 'zod';

import { MediaType, MediaVisibility } from '@mad/types';

export const addGalleryItemsSchema = z.object({
  items: z.array(
    z.object({
      mediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
      url: z.string().url('Must be a valid URL'),
      publicId: z.string().min(1, 'Public ID is required'),
      assetProvider: z.string().default('cloudinary'),
      thumbnail: z.string().url().optional(),
      caption: z.string().max(255).optional(),
    })
  ).min(1, 'At least one item is required')
});

export const updateGalleryItemSchema = z.object({
  caption: z.string().max(255).optional(),
  visibility: z.nativeEnum(MediaVisibility).optional(),
});

export const setCoverImageSchema = z.object({
  isCover: z.literal(true),
});

export const updateGalleryVisibilitySchema = z.object({
  visibility: z.nativeEnum(MediaVisibility),
});

export const reorderGalleryItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});

export const updateGallerySettingsSchema = z.object({
  heading: z.string().max(255).optional(),
  thankYouMessage: z.string().max(1000).optional(),
  highlights: z.array(z.string()).optional(),
  published: z.boolean().optional(),
});

export type AddGalleryItemsInput = z.infer<typeof addGalleryItemsSchema>;
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;
export type ReorderGalleryItemsInput = z.infer<typeof reorderGalleryItemsSchema>;
export type UpdateGallerySettingsInput = z.infer<typeof updateGallerySettingsSchema>;
