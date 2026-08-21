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

export const ticketsArraySchema = z
  .array(checkoutTicketSchema)
  .min(1, 'Must select at least one ticket')
  .superRefine((tickets, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < tickets.length; i++) {
      const tier = tickets[i].tier;
      if (seen.has(tier)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate ticket tiers are not allowed',
          path: [i],
        });
      }
      seen.add(tier);
    }
  });

export const checkoutSchema = z.object({
  eventId: objectIdSchema,
  guestName: z.string().min(2, 'Guest name is required').max(200, 'Guest name is too long'),
  guestEmail: z.string().email('Invalid email address format').max(200, 'Email address is too long'),
  guestPhone: z.string().min(8, 'Invalid phone number format').max(50, 'Phone number is too long'),
  tickets: ticketsArraySchema,
  couponCode: z
    .string()
    .toUpperCase()
    .trim()
    .max(50)
    .optional(),
}).strict();

export const reserveTicketsSchema = z.object({
  eventId: objectIdSchema,
  tickets: ticketsArraySchema,
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
  guestPhone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
  keepUpdated: z.boolean().default(false),
  sendBestEvents: z.boolean().default(false),
  ageConfirmed: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
}).strict();

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

// Migrated auth validation schemas
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(254, 'Email is too long');

export const otpSchema = z
  .string()
  .trim()
  .min(6, 'Passcode must be 6 digits')
  .max(6, 'Passcode must be 6 digits')
  .regex(/^\d{6}$/, 'Passcode must be 6 digits');

export const checkEmailSchema = z.object({
  email: emailSchema,
}).strict();

export const verifyAuthSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
}).strict();

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/, 'Mobile number must be in valid E.164 international format (e.g. +14155552671 or +919876543210)')
    .optional()
    .or(z.literal('')),
}).strict();

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .min(1, 'Confirmation is required'),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReserveTicketsInput = z.infer<typeof reserveTicketsSchema>;
export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;
export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;
export type StripePaymentIntentInput = z.infer<typeof stripePaymentIntentSchema>;
export type AdminDlqRetryInput = z.infer<typeof adminDlqRetrySchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export * from './upload.validator';
export * from './normalizers';
export * from './event-gallery.validator';
