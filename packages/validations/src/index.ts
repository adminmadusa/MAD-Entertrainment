import { z } from 'zod';

// MongoDB ObjectId regex validator (24 hex characters)
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Mongoose ObjectId identifier');

export const checkoutTicketSchema = z.object({
  tier: z.string().min(1, 'Ticket tier identifier is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  seats: z
    .array(
      z.object({
        seatId: z.string().min(1),
        row: z.string().min(1),
        number: z.number().int(),
        section: z.string().optional(),
      })
    )
    .optional(),
});

export const checkoutSchema = z.object({
  eventId: objectIdSchema,
  guestName: z.string().min(2, 'Guest name is required'),
  guestEmail: z.string().email('Invalid email address format'),
  guestPhone: z.string().min(8, 'Invalid phone number format'),
  tickets: z.array(checkoutTicketSchema).min(1, 'Must select at least one ticket'),
  couponCode: z
    .string()
    .toUpperCase()
    .trim()
    .optional(),
});

export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
});

export const stripePaymentIntentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Stripe payment intent ID is required'),
});

export const adminDlqRetrySchema = z.object({
  dlqId: objectIdSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;
export type StripePaymentIntentInput = z.infer<typeof stripePaymentIntentSchema>;
export type AdminDlqRetryInput = z.infer<typeof adminDlqRetrySchema>;
