import { z } from 'zod';
import { EventCategory, BOOKING_REFERENCE_REGEX } from '@mad/shared';
import { objectIdSchema, checkoutSchema as createBookingSchema, reserveTicketsSchema, checkoutDetailsSchema } from '@mad/validations';
export { createBookingSchema, reserveTicketsSchema, checkoutDetailsSchema };

// ─── Shared Validators ──────────────────────────────────────────

export const bookingReferenceSchema = z
  .string()
  .regex(BOOKING_REFERENCE_REGEX, 'Invalid booking reference format (expected MAD-YYYY-XXXXX)')
  .max(20);

const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => String(value));

const paginationLimitSchema = z.coerce.number().int().positive().max(100);

// ─── REST Endpoint Payloads ─────────────────────────────────────

export const bookingReferenceParamSchema = z.object({
  bookingId: bookingReferenceSchema,
}).strict();

export const listEventsQuerySchema = z.object({
  category: z.nativeEnum(EventCategory).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: paginationLimitSchema.default(12),
  includeTotal: booleanQuerySchema.optional(),
}).strict();


export const getEventSeatLayoutParamSchema = z.object({
  eventId: objectIdSchema,
}).strict();

export const createPaymentIntentSchema = z.object({
  bookingId: bookingReferenceSchema,
  gateway: z.enum(['stripe', 'razorpay'], {
    errorMap: () => ({ message: "Gateway must be 'stripe' or 'razorpay'" }),
  }),
}).strict();

export const verifyPaymentSchema = z
  .object({
    bookingId: bookingReferenceSchema,
    razorpay_order_id: z.string().max(100).optional(),
    razorpay_payment_id: z.string().max(100).optional(),
    razorpay_signature: z.string().max(200).optional(),
    paymentIntentId: z.string().max(100).optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.razorpay_order_id && data.razorpay_payment_id && data.razorpay_signature) || data.paymentIntentId,
    { message: 'Stripe paymentIntentId or Razorpay verification fields are required' }
  );

export const listReservationsQuerySchema = z.object({
  status: z.string().max(50).optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(50)
    .transform((val) => Math.min(val, 100)),
}).strict();

export const retryFailedJobParamSchema = z.object({
  id: objectIdSchema,
}).strict();

// createBookingSchema is imported directly from @mad/validations (as checkoutSchema)

// ─── Socket Event Payloads ──────────────────────────────────────

export const socketEventJoinSchema = z.object({
  eventId: objectIdSchema,
}).strict();

export const socketBookingJoinSchema = z.object({
  bookingId: objectIdSchema,
}).strict();

export const socketSeatActionSchema = z.object({
  eventId: objectIdSchema,
  seatIds: z.array(z.string().max(100)).min(1, 'At least one seat must be selected'),
  sessionId: z.string().uuid('Invalid session UUID format'),
}).strict();
