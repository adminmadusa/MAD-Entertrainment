import { z } from 'zod';

export const listWebhooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  provider: z.enum(['stripe', 'razorpay']).optional(),
  status: z.enum(['received', 'processing', 'success', 'failed', 'ignored']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).strict();
