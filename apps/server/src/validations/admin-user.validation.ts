import { z } from 'zod';

import { objectIdSchema } from '@mad/validations';

const adminPaginationLimitSchema = z.coerce.number().int().positive().max(100);

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: adminPaginationLimitSchema.default(10),
  search: z.string().max(200).optional(),
  type: z.enum(['registered', 'guest']),
  sortField: z.enum(['name', 'email', 'createdAt', 'lastLogin']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

export const adminUserByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
});

export const adminUserByEmailSchema = z.object({
  params: z.object({
    email: z.string().email('Invalid email address format'),
  }).strict(),
});
