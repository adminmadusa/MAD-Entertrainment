import { z } from 'zod';

import { MediaType } from '@mad/types';

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

export const updateGallerySettingsSchema = z.object({
  published: z.boolean().optional(),
});

export const updateGalleryItemSchema = z.object({
  caption: z.string().max(255).optional(),
});

export const reorderGalleryItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1, 'At least one item ID is required'),
});

export type AddGalleryItemsInput = z.infer<typeof addGalleryItemsSchema>;
export type UpdateGallerySettingsInput = z.infer<typeof updateGallerySettingsSchema>;
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemSchema>;
export type ReorderGalleryItemsInput = z.infer<typeof reorderGalleryItemsSchema>;
