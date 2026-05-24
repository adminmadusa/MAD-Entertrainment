import { z } from 'zod';

export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'] as const,
};

export const uploadImageQuerySchema = z.object({
  folder: z.string().optional().default('general'),
});
