import { z } from 'zod';

export const ALLOWED_QUEUE_NAMES = [
  'booking-queue',
  'pdf-queue',
  'notification-queue',
  'marketing-queue',
] as const;

/**
 * Validates the :name route parameter for queue control endpoints.
 * Rejects all free-form queue names — only the four platform queues are accepted.
 */
export const queueNameParamSchema = z.object({
  name: z.enum(ALLOWED_QUEUE_NAMES),
});
