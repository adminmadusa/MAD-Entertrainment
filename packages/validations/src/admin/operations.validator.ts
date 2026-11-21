import { z } from 'zod';

import { BookingStatus, BOOKING_REFERENCE_REGEX } from '@mad/shared';
import { objectIdSchema } from '../common.validator';

export const adminPaginationLimitSchema = z.coerce.number().int().positive().max(100);

export const adminIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }).strict(),
});

export const adminBulkIdsSchema = z.object({
  body: z.object({
    ids: z.array(z.string().trim().min(1)).min(1, 'At least one ID must be provided'),
  }),
});

export const bookingReferenceSchema = z
  .string()
  .regex(BOOKING_REFERENCE_REGEX, 'Invalid booking reference format (expected MAD-YYYY-XXXXX)')
  .max(20);

export const adminBookingIdentifierParamSchema = z.object({
  params: z.object({
    id: z.union([objectIdSchema, bookingReferenceSchema]),
  }).strict(),
});

export const adminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: adminPaginationLimitSchema.default(15),
  search: z.string().max(200).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  eventId: objectIdSchema.optional(),
  sortField: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).strict();

export const bookingsSummarySchema = z.object({
  query: z.object({
    eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event ID format').optional(),
  }),
});

export const cancelBookingSchema = z.object({
  body: z.object({
    reason: z.string().max(500, 'Reason must be under 500 characters').optional(),
    refundAmount: z.number().positive('Refund amount must be greater than zero').optional(),
    ticketIds: z.array(objectIdSchema).optional(),
  }),
  params: adminIdParamSchema.shape.params,
});

export const correctBookingEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email('Invalid email address'),
    reason: z
      .string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason must be under 500 characters'),
  }),
  params: adminIdParamSchema.shape.params,
});

export const resendBookingTicketsSchema = z.object({
  params: adminIdParamSchema.shape.params,
});

export const createRefundSchema = z.object({
  body: z.object({
    bookingId: objectIdSchema,
    paymentId: objectIdSchema,
    amount: z.number().positive('Refund amount must be greater than zero'),
    reason: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
    cancelTickets: z.boolean().optional(),
    ticketIds: z.array(objectIdSchema).optional(),
  }).strict(),
});

export const processRefundSchema = z.object({
  params: adminIdParamSchema.shape.params,
  body: z.object({
    action: z.enum(['approve', 'reject']),
    adminNotes: z.string().trim().max(2000).optional(),
    gatewayRefundId: z.string().trim().max(100).optional(),
    manualOverride: z.boolean().optional(),
    overrideReason: z.string().trim().max(1000).optional(),
  }).strict().superRefine((data, ctx) => {
    if (data.manualOverride === true) {
      if (!data.overrideReason || data.overrideReason.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['overrideReason'],
          message: 'Override reason must be at least 10 characters when manualOverride is true',
        });
      }
    }
  }),
});

export const scannerScanSchema = z.object({
  body: z.object({
    ticketId: z.string().trim().min(1, 'Ticket ID is required').max(100),
    eventId: objectIdSchema,
    requestId: z.string().optional(),
    source: z.enum(['camera', 'manual', 'hardware']).optional(),
    offline: z.boolean().optional(),
  }).strict(),
});

export const scannerStatsSchema = z.object({
  params: z.object({
    eventId: objectIdSchema,
  }).strict(),
});

export const scannerHistorySchema = z.object({
  params: z.object({
    eventId: objectIdSchema,
  }).strict(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().optional(),
    operator: z.string().optional(),
    search: z.string().optional(),
  }).strict().optional(),
});
