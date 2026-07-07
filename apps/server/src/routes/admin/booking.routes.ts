import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as bookingController from '../../controllers/admin/booking.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import {
  adminBookingIdentifierParamSchema,
  adminBookingsQuerySchema,
  cancelBookingSchema,
  correctBookingEmailSchema,
  resendBookingTicketsSchema,
  bookingsSummarySchema,
} from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.get('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validateQuery(adminBookingsQuerySchema), bookingController.getBookings);
router.get('/summary', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validate(bookingsSummarySchema), bookingController.getBookingsSummary);
router.get('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validate(adminBookingIdentifierParamSchema), bookingController.getBookingById);
router.patch('/:id/cancel', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(cancelBookingSchema), bookingController.cancelBooking);
router.patch('/:id/correct-email', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(correctBookingEmailSchema), bookingController.correctBookingEmail);
router.post('/:id/resend', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(resendBookingTicketsSchema), bookingController.resendBookingTickets);

export default router;
