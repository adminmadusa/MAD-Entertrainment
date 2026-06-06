import { z } from 'zod';

export const recoverBookingSchema = z.object({
  transactionId: z
    .string({ required_error: 'Transaction ID is required' })
    .trim()
    .min(4, 'Transaction ID must be at least 4 characters')
    .max(254, 'Transaction ID must be at most 254 characters'),
}).strict();
