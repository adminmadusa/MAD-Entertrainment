import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../../middleware/error.middleware';
import { PublicBookingService } from '../../../services/public/booking.service';
import { signSessionToken } from '../../../utils/jwt';
import { sendSuccess } from '../../../utils/response';

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
    const sessionId = req.session?.sessionId || req.header('x-session-id') || undefined;

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

    if ((booking as any).isReused) {
      res.setHeader('X-Booking-Idempotency', 'Reused');
      sendSuccess(
        res,
        booking,
        'Booking retrieved successfully',
        200
      );
    } else {
      res.setHeader('X-Booking-Idempotency', 'New');
      sendSuccess(
        res,
        booking,
        'Booking created successfully',
        201
      );
    }
  } catch (err) {
    next(err);
  }
}
