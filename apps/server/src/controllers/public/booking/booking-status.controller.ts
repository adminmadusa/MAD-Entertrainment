import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../../middleware/error.middleware';
import { PublicBookingService } from '../../../services/public/booking.service';
import { buildQrCodeImageUrl } from '../../../services/public/ticket-ownership.service';
import { sendSuccess } from '../../../utils/response';

// ─────────────────────────────────────────────
// Get Logged-in User Bookings
// ─────────────────────────────────────────────

export async function getMyBookings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.sub;
    const sessionId = req.session?.sessionId || req.header('x-session-id') || undefined;

    if (!userId && !sessionId) {
      throw AppError.unauthorized('Authentication or guest session required');
    }

    const bookingsResult = await PublicBookingService.getMyBookings({
      userId,
      sessionId,
    });

    // Mask ticket QR codes if assignmentStatus is 'pending' or 'claimed'
    const maskedTickets = bookingsResult.tickets.map((t: any) => {
      const ticketObj = typeof t.toObject === 'function' ? t.toObject() : t;
      if (
        ticketObj.assignmentStatus === 'pending' ||
        ticketObj.assignmentStatus === 'claimed'
      ) {
        ticketObj.qrCode = undefined;
        ticketObj.qrCodeImage = undefined;
      } else {
        ticketObj.qrCodeImage = buildQrCodeImageUrl(ticketObj.ticketId);
      }
      return ticketObj;
    });

    sendSuccess(
      res,
      {
        bookings: bookingsResult.bookings,
        tickets: maskedTickets,
        ticketsReadyMap: bookingsResult.ticketsReadyMap,
      },
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
    const reqUserId = req.user?.sub;
    const reqSessionId = req.session?.sessionId || undefined;

    const result = await PublicBookingService.getBookingByReference(
      bookingId
    );

    if (!result) {
      if (!reqUserId) {
        const err = AppError.forbidden('Email verification required');
        err.code = 'BOOKING_VERIFICATION_REQUIRED';
        throw err;
      }
      throw AppError.notFound('Booking');
    }

    const booking = result.booking;

    // Assert access
    PublicBookingService.assertBookingAccess(
      booking,
      { userId: reqUserId, sessionId: reqSessionId },
      'Fulfillment'
    );

    // Mask ticket QR codes if assignmentStatus is 'pending' or 'claimed'
    const maskedTickets = result.tickets.map((t: any) => {
      const ticketObj = typeof t.toObject === 'function' ? t.toObject() : t;
      if (
        ticketObj.assignmentStatus === 'pending' ||
        ticketObj.assignmentStatus === 'claimed'
      ) {
        ticketObj.qrCode = undefined;
        ticketObj.qrCodeImage = undefined;
      } else {
        ticketObj.qrCodeImage = buildQrCodeImageUrl(ticketObj.ticketId);
      }
      return ticketObj;
    });

    sendSuccess(
      res,
      {
        booking: result.booking,
        tickets: maskedTickets,
        ticketsReady: result.ticketsReady,
      },
      'Booking retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Save Checkout Details
// ─────────────────────────────────────────────

export async function saveCheckoutDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;
    const sessionId = req.session?.sessionId || req.header('x-session-id') || undefined;
    const userId = req.user?.sub;

    const booking = await PublicBookingService.saveCheckoutDetails(
      bookingId,
      req.body,
      sessionId,
      userId
    );

    sendSuccess(
      res,
      booking,
      'Checkout details saved successfully'
    );
  } catch (err) {
    next(err);
  }
}
