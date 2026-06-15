import { z } from 'zod';

export const recoverBookingSchema = z.object({
  transactionId: z
    .string({ required_error: 'Transaction ID is required' })
    .trim()
    .min(4, 'Transaction ID must be at least 4 characters')
    .max(254, 'Transaction ID must be at most 254 characters'),
}).strict();

export const verifyRecoveredBookingOTPSchema = z.object({
  transactionId: z
    .string({ required_error: 'Transaction ID is required' })
    .trim()
    .min(4, 'Transaction ID must be at least 4 characters')
    .max(254, 'Transaction ID must be at most 254 characters'),
  otp: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d+$/, 'Verification code must be numeric'),
}).strict();

