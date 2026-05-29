import { Router } from 'express';

import {
    createBooking,
    getBooking,
    getMyBookings,
    getSessionToken,
    saveCheckoutDetails,
    downloadBookingPDF,
    resendBookingTickets,
} from '../../controllers/public/booking.controller';

import {
    requireAuth,
    optionalAuth,
} from '../../middleware/auth.middleware';
import { authLimiter, resendLimiter } from '../../middleware/rate.middleware';

import { validateBody, validateParams } from '../../middleware/validation.middleware';
import { reserveTicketsSchema, checkoutDetailsSchema, bookingReferenceParamSchema } from '../../validations/payment.validation';

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
    validateBody(reserveTicketsSchema),
    createBooking
);

router.put(
    '/:bookingId/checkout-details',
    optionalAuth,
    validateParams(bookingReferenceParamSchema),
    validateBody(checkoutDetailsSchema),
    saveCheckoutDetails
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

router.get(
    '/:bookingId/download',
    optionalAuth,
    validateParams(bookingReferenceParamSchema),
    downloadBookingPDF
);

router.post(
    '/:bookingId/resend',
    optionalAuth,
    resendLimiter,
    validateParams(bookingReferenceParamSchema),
    resendBookingTickets
);

export default router;