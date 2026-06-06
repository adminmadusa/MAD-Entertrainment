import { z } from 'zod';

// MongoDB ObjectId regex validator (24 hex characters)
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Mongoose ObjectId identifier');

export const checkoutTicketSchema = z.object({
  tier: z.string().min(1, 'Ticket tier identifier is required').max(100),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  seats: z
    .array(
      z.object({
        seatId: z.string().min(1).max(100),
        row: z.string().min(1).max(50),
        number: z.number().int(),
        section: z.string().max(50).optional(),
      }).strict()
    )
    .optional(),
}).strict();

export const checkoutSchema = z.object({
  eventId: objectIdSchema,
  guestName: z.string().min(2, 'Guest name is required').max(200, 'Guest name is too long'),
  guestEmail: z.string().email('Invalid email address format').max(200, 'Email address is too long'),
  guestPhone: z.string().min(8, 'Invalid phone number format').max(50, 'Phone number is too long'),
  tickets: z.array(checkoutTicketSchema).min(1, 'Must select at least one ticket'),
  couponCode: z
    .string()
    .toUpperCase()
    .trim()
    .max(50)
    .optional(),
}).strict();

export const reserveTicketsSchema = z.object({
  eventId: objectIdSchema,
  tickets: z.array(checkoutTicketSchema).min(1, 'Must select at least one ticket'),
  couponCode: z
    .string()
    .toUpperCase()
    .trim()
    .max(50)
    .optional(),
}).strict();

export const checkoutDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  guestEmail: z.string().email('Invalid email address format').max(200, 'Email address is too long'),
  guestEmailConfirm: z.string().email('Invalid email confirmation format').max(200, 'Confirmation email is too long').optional(),
  guestPhone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
  keepUpdated: z.boolean().default(false),
  sendBestEvents: z.boolean().default(false),
  ageConfirmed: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
}).strict().refine((data) => !data.guestEmailConfirm || data.guestEmail === data.guestEmailConfirm, {
  message: "Emails do not match",
  path: ['guestEmailConfirm'],
});

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Razorpay order ID is required').max(100),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required').max(100),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required').max(200),
}).strict();

export const stripePaymentIntentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Stripe payment intent ID is required').max(100),
}).strict();

export const adminDlqRetrySchema = z.object({
  dlqId: objectIdSchema,
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReserveTicketsInput = z.infer<typeof reserveTicketsSchema>;
export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;
export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;
export type StripePaymentIntentInput = z.infer<typeof stripePaymentIntentSchema>;
export type AdminDlqRetryInput = z.infer<typeof adminDlqRetrySchema>;
export * from './upload.validator';
