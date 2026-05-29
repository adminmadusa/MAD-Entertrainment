import { Router } from 'express';
import { z } from 'zod';

import * as bookingController from '../../controllers/admin/booking.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

// Validation schema for cancel booking request
const cancelBookingSchema = z.object({
  body: z.object({
    reason: z.string().max(500, 'Reason must be under 500 characters').optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

// Validation schema for email correction request
const correctBookingEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email('Invalid email address'),
    reason: z
      .string()
      .min(5, 'Reason must be at least 5 characters')
      .max(500, 'Reason must be under 500 characters'),
  }),
  params: z.object({
    id: z.string(),
  }),
});

// Validation schema for ticket resend request
const resendBookingTicketsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/cancel', validate(cancelBookingSchema), bookingController.cancelBooking);
router.patch('/:id/correct-email', validate(correctBookingEmailSchema), bookingController.correctBookingEmail);
router.post('/:id/resend', validate(resendBookingTicketsSchema), bookingController.resendBookingTickets);

export default router;
