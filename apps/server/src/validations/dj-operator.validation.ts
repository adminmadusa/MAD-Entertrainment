import { z } from 'zod';

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => String(value));

const paginationLimitSchema = z.coerce.number().int().positive().max(100);

export const listDJOperatorsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: paginationLimitSchema.default(12),
  includeTotal: booleanQuerySchema.optional(),
}).strict();
