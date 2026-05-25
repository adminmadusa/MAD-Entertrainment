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

router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.patch('/:id/cancel', validate(cancelBookingSchema), bookingController.cancelBooking);

export default router;
