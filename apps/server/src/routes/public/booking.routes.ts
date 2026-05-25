import { Router } from 'express';

import {
    createBooking,
    getBooking,
    getMyBookings,
    getSessionToken,
} from '../../controllers/public/booking.controller';

import {
    requireAuth,
    optionalAuth,
} from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rate.middleware';

import { validateBody, validateParams } from '../../middleware/validation.middleware';
import { createBookingSchema, bookingReferenceParamSchema } from '../../validations/payment.validation';

const router: Router = Router();

// ─────────────────────────────────────────────
// Guest Session Token
// ─────────────────────────────────────────────

router.get('/session', authLimiter as any, getSessionToken);

// ─────────────────────────────────────────────
// Create Booking
// Supports:
// - guest session JWT
// - authenticated users
// ─────────────────────────────────────────────

router.post(
    '/',
    optionalAuth,
    validateBody(createBookingSchema),
    createBooking
);

// ─────────────────────────────────────────────
// Logged-in User Bookings
// USER JWT ONLY
// ─────────────────────────────────────────────

router.get(
    '/me',
    requireAuth,
    getMyBookings
);

// ─────────────────────────────────────────────
// Single Booking Access
// Supports:
// - owner user JWT
// - guest session JWT
// ─────────────────────────────────────────────

router.get(
    '/:bookingId',
    optionalAuth,
    validateParams(bookingReferenceParamSchema),
    getBooking
);

export default router;