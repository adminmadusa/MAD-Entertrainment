import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import { getQueueName } from '../../../config/queue.config';
import { AppError } from '../../../middleware/error.middleware';
import { CacheService } from '../../../services/cache.service';
import { PublicBookingService } from '../../../services/public/booking.service';
import { QueueService } from '../../../services/queue.service';
import { generateTicketPDF } from '../../../utils/pdf';
import { sendSuccess } from '../../../utils/response';

// ─────────────────────────────────────────────
// Download Booking PDF
// ─────────────────────────────────────────────

export async function downloadBookingPDF(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;
    const token = req.query?.token as string;
    const reqUserId = req.user?.sub;
    const reqSessionId = req.session?.sessionId || undefined;

    let booking: any;

    if (token) {
      const cacheKey = `otd:${token}`;
      const tokenData = await CacheService.get<{ bookingId: string }>(cacheKey);
      if (!tokenData) {
        throw AppError.unauthorized('Invalid or expired download token');
      }

      // Immediately invalidate the token (single-use)
      await CacheService.del(cacheKey);

      const result = await PublicBookingService.getBookingByReference(tokenData.bookingId);
      if (!result) {
        throw AppError.notFound('Booking not found');
      }

      booking = result.booking;

      // Safety check: ensure requested bookingId matches token payload
      const actualBookingId = booking.bookingId;
      const actualIdStr = booking._id.toString();
      if (bookingId !== actualBookingId && bookingId !== actualIdStr) {
        throw AppError.forbidden('Invalid download request parameters');
      }
    } else {
      const result = await PublicBookingService.getBookingByReference(bookingId);
      if (!result) {
        if (!reqUserId) {
          const err = AppError.forbidden('Email verification required');
          err.code = 'BOOKING_VERIFICATION_REQUIRED';
          throw err;
        }
        throw AppError.notFound('Booking not found');
      }

      booking = result.booking;

      // Assert access
      PublicBookingService.assertBookingAccess(
        booking,
        { userId: reqUserId, sessionId: reqSessionId },
        'Fulfillment'
      );
    }

    const pdfBuffer = await generateTicketPDF(booking, booking.eventId, {
      role: 'purchaser',
      userId: reqUserId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MAD_Ticket_${booking.bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Generate Download Token (OTD)
// ─────────────────────────────────────────────

export async function generateDownloadToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;
    const reqUserId = req.user?.sub;
    const reqSessionId = req.session?.sessionId || undefined;

    const result = await PublicBookingService.getBookingByReference(bookingId);
    if (!result) {
      throw AppError.notFound('Booking not found');
    }

    const booking = result.booking;

    // Assert access
    PublicBookingService.assertBookingAccess(
      booking,
      { userId: reqUserId, sessionId: reqSessionId },
      'Fulfillment'
    );

    const token = crypto.randomUUID();
    const cacheKey = `otd:${token}`;
    await CacheService.set(cacheKey, { bookingId: booking._id.toString() }, 60);

    sendSuccess(
      res,
      { downloadToken: token },
      'Download token generated successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// Resend Booking Tickets
// ─────────────────────────────────────────────

export async function resendBookingTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { bookingId } = req.params;
    const reqUserId = req.user?.sub;
    const reqSessionId = req.session?.sessionId || undefined;

    const result = await PublicBookingService.getBookingByReference(bookingId);
    if (!result) {
      if (!reqUserId) {
        const err = AppError.forbidden('Email verification required');
        err.code = 'BOOKING_VERIFICATION_REQUIRED';
        throw err;
      }
      throw AppError.notFound('Booking not found');
    }

    const booking = result.booking;

    // Assert access
    PublicBookingService.assertBookingAccess(
      booking,
      { userId: reqUserId, sessionId: reqSessionId },
      'Fulfillment'
    );

    const eventIdStr = (booking.eventId as any)._id?.toString() || booking.eventId.toString();
    const resendId = crypto.randomUUID();

    // Reuse existing PDF / email infrastructure by enqueuing a pdf:generate job
    await QueueService.enqueue(
      getQueueName('pdf-queue'),
      'pdf:generate',
      {
        bookingId: booking._id.toString(),
        eventId: eventIdStr,
        recipientEmail: booking.guestEmail,
        guestName: booking.guestName,
        isResend: true,
        resendId,
      },
      `pdf-generate-${booking._id}-resend-${resendId}` // Bypass BullMQ deduplication
    );

    sendSuccess(
      res,
      null,
      'Tickets resent successfully'
    );
  } catch (err) {
    next(err);
  }
}
