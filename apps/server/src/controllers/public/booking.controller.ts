import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { signSessionToken } from '../../utils/jwt';
import { PublicBookingService } from '../../services/public/booking.service';

// ─────────────────────────────────────────────
// Issue Guest Session Token
// ─────────────────────────────────────────────

export async function getSessionToken(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = crypto.randomUUID();
    const token = signSessionToken(sessionId);

    sendSuccess(
      res,
      {
        token,
        sessionId,
      },
      'Session token issued'
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Create Booking
// ─────────────────────────────────────────────

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Logged-in user
    const userId = req.user?.sub;

    // Guest session UUID
    const sessionId = req.header('x-session-id') || undefined;

    // Require either:
    // - authenticated user
    // - guest session
    if (!userId && !sessionId) {
      throw AppError.unauthorized('Authentication required');
    }

    // Create booking
    const booking = await PublicBookingService.createBooking(
      req.body,
      sessionId,
      userId
    );

    sendSuccess(
      res,
      booking,
      'Booking created successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Get Logged-in User Bookings
// ─────────────────────────────────────────────

export async function getMyBookings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.sub) {
      throw AppError.unauthorized('Authentication required');
    }

    const bookings = await PublicBookingService.getMyBookings(
      req.user.sub
    );

    sendSuccess(
      res,
      bookings,
      'Bookings retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Get Single Booking
// ─────────────────────────────────────────────

export async function getBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;

    const result = await PublicBookingService.getBookingByReference(
      bookingId
    );

    if (!result) {
      throw AppError.notFound('Booking');
    }

    const booking = result.booking;
    const reqUserId = req.user?.sub;
    const reqSessionId = req.header('x-session-id') || undefined;

    // Logged-in ownership
    const isUserOwner =
      !!booking.userId &&
      !!reqUserId &&
      booking.userId.toString() === reqUserId;

    // Guest ownership
    const isGuestOwner =
      !!booking.sessionId &&
      !!reqSessionId &&
      booking.sessionId === reqSessionId;

    // Access denied
    if (!isUserOwner && !isGuestOwner) {
      throw AppError.forbidden('You do not have access to this booking');
    }

    sendSuccess(
      res,
      result,
      'Booking retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
}