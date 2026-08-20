import { z } from 'zod';

export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/x-png',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif',
  ] as const,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif'] as const,
};

export const uploadImageQuerySchema = z.object({
  folder: z.string().optional().default('general'),
});
