import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { PublicBookingService } from '../../services/public/booking.service';
import { sendCreated, sendSuccess } from '../../utils/response';
import { signSessionToken, verifySessionToken } from '../../utils/jwt';

export async function getSessionToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = crypto.randomUUID();
    const token = signSessionToken(sessionId);
    res.json({ success: true, data: { token, sessionId } });
  } catch (err) {
    next(err);
  }
}

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionToken = req.header('x-session-id');
    if (!sessionToken) {
       res.status(401).json({ success: false, message: 'Missing session token' });
       return;
    }
    const sessionId = verifySessionToken(sessionToken);
    const booking = await PublicBookingService.createBooking(req.body, sessionId, req.user?.sub);
    sendCreated(res, booking, 'Booking created');
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
    
    const sessionToken = req.header('x-session-id');
    let sessionId: string | undefined;
    if (sessionToken) {
      try {
        sessionId = verifySessionToken(sessionToken);
      } catch (err) {
        // invalid token ignored for now
      }
    }
    const userId = req.user?.sub;
    
    const result = await PublicBookingService.getBookingByReference(bookingId);
    
    const isOwner = result.booking.userId?.toString() === userId;
    const isSessionOwner = result.booking.sessionId === sessionId;
    const isLegacy = !result.booking.userId && !result.booking.sessionId;

    if (!isOwner && !isSessionOwner && !isLegacy) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    
    sendSuccess(res, result, 'Booking retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const result = await PublicBookingService.getMyBookings(userId);
    sendSuccess(res, result, 'Bookings retrieved');
  } catch (err) {
    next(err);
  }
}
