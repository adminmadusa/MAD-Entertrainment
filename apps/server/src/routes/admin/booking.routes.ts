import { Router } from 'express';
import { z } from 'zod';
import { AdminRole } from '@mad/shared';

import * as bookingController from '../../controllers/admin/booking.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { adminBookingIdentifierParamSchema, adminBookingsQuerySchema, adminIdParamSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

// Validation schema for cancel booking request
const cancelBookingSchema = z.object({
  body: z.object({
    reason: z.string().max(500, 'Reason must be under 500 characters').optional(),
  }),
  params: adminIdParamSchema.shape.params,
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
  params: adminIdParamSchema.shape.params,
});

// Validation schema for ticket resend request
const resendBookingTicketsSchema = z.object({
  params: adminIdParamSchema.shape.params,
});

// Validation schema for bookings summary request
const bookingsSummarySchema = z.object({
  query: z.object({
    eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event ID format').optional(),
  }),
});

router.get('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validateQuery(adminBookingsQuerySchema), bookingController.getBookings);
router.get('/summary', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validate(bookingsSummarySchema), bookingController.getBookingsSummary);
router.get('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validate(adminBookingIdentifierParamSchema), bookingController.getBookingById);
router.patch('/:id/cancel', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(cancelBookingSchema), bookingController.cancelBooking);
router.patch('/:id/correct-email', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(correctBookingEmailSchema), bookingController.correctBookingEmail);
router.post('/:id/resend', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(resendBookingTicketsSchema), bookingController.resendBookingTickets);

export default router;
