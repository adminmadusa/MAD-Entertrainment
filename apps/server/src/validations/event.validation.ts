import { z } from 'zod';
import { EventCategory, EventStatus } from '@mad/shared';
import { objectIdSchema } from '@mad/validations';

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => String(value));

const paginationLimitSchema = z.coerce.number().int().positive().max(100);

export const listEventsQuerySchema = z.object({
  category: z.nativeEnum(EventCategory).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: paginationLimitSchema.default(12),
  includeTotal: booleanQuerySchema.optional(),
}).strict();

export const getEventSeatLayoutParamSchema = z.object({
  eventId: objectIdSchema,
}).strict();
