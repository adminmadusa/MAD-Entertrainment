import { Router } from 'express';

import {
    createBooking,
    getBooking,
    getMyBookings,
    getSessionToken,
    saveCheckoutDetails,
    downloadBookingPDF,
    resendBookingTickets,
    recoverBooking,
    verifyRecoveredBookingOTP,
} from '../../controllers/public/booking.controller';
import * as bookingController from '../../controllers/public/booking.controller';
import { recoverBookingSchema, verifyRecoveredBookingOTPSchema } from '../../validations/booking-recovery.validation';

import {
    requireAuth,
    optionalAuth,
} from '../../middleware/auth.middleware';
import { authLimiter, resendLimiter, generalLimiter, bookingLimiter, recoveryLimiter } from '../../middleware/rate.middleware';

import { validateBody, validateParams } from '../../middleware/validation.middleware';
import { reserveTicketsSchema, checkoutDetailsSchema, bookingReferenceParamSchema } from '../../validations/payment.validation';

const router: Router = Router();

// ─────────────────────────────────────────────
// Guest Session Token
// ─────────────────────────────────────────────

router.get('/session', generalLimiter as any, getSessionToken);

// ─────────────────────────────────────────────
// Create Booking
// Supports:
// - guest session JWT
// - authenticated users
// ─────────────────────────────────────────────

router.post(
    '/',
    optionalAuth,
    bookingLimiter,
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

router.post(
    '/:bookingId/download-token',
    optionalAuth,
    validateParams(bookingReferenceParamSchema),
    (req, res, next) => bookingController.generateDownloadToken(req, res, next)
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

// ─────────────────────────────────────────────
// Transaction Recovery Backend API
// ─────────────────────────────────────────────

router.post(
    '/recover',
    recoveryLimiter as any,
    validateBody(recoverBookingSchema),
    recoverBooking
);

router.post(
    '/recover/verify',
    recoveryLimiter as any,
    validateBody(verifyRecoveredBookingOTPSchema),
    verifyRecoveredBookingOTP
);


export default router;
