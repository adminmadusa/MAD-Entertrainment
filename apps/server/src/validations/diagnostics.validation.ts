import { z } from 'zod';

export const listDlqQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  queueName: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
}).strict();
