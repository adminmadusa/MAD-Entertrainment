import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { signSessionToken } from '../../utils/jwt';
import { PublicBookingService } from '../../services/public/booking.service';
import { BookingRecoveryService } from '../../services/public/booking-recovery.service';
import { auditLog } from '../../utils/audit';
import { generateTicketPDF } from '../../utils/pdf';
import { QueueService } from '../../services/queue.service';
import { getQueueName } from '../../config/queue.config';

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

    // Logged-in ownership
    const isUserOwner =
      !!booking.userId &&
      !!reqUserId &&
      booking.userId.toString() === reqUserId;

    // Guest ownership
    const isGuestOwner =
      !booking.userId &&
      !!booking.sessionId &&
      !!reqSessionId &&
      booking.sessionId === reqSessionId;

    // Access denied
    if (!isUserOwner && !isGuestOwner) {
      const err = AppError.forbidden(
        !reqUserId ? 'Email verification required' : 'You do not have access to this booking'
      );
      if (!reqUserId) {
        err.code = 'BOOKING_VERIFICATION_REQUIRED';
      }
      throw err;
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

    // Logged-in ownership
    const isUserOwner =
      !!booking.userId &&
      !!reqUserId &&
      booking.userId.toString() === reqUserId;

    // Guest ownership
    const isGuestOwner =
      !booking.userId &&
      !!booking.sessionId &&
      !!reqSessionId &&
      booking.sessionId === reqSessionId;

    if (!isUserOwner && !isGuestOwner) {
      const err = AppError.forbidden(
        !reqUserId ? 'Email verification required' : 'You do not have access to this booking'
      );
      if (!reqUserId) {
        err.code = 'BOOKING_VERIFICATION_REQUIRED';
      }
      throw err;
    }

    const pdfBuffer = await generateTicketPDF(booking, booking.eventId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MAD_Ticket_${booking.bookingId}.pdf"`);
    res.send(pdfBuffer);
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

    // Logged-in ownership
    const isUserOwner =
      !!booking.userId &&
      !!reqUserId &&
      booking.userId.toString() === reqUserId;

    // Guest ownership
    const isGuestOwner =
      !booking.userId &&
      !!booking.sessionId &&
      !!reqSessionId &&
      booking.sessionId === reqSessionId;

    if (!isUserOwner && !isGuestOwner) {
      const err = AppError.forbidden(
        !reqUserId ? 'Email verification required' : 'You do not have access to this booking'
      );
      if (!reqUserId) {
        err.code = 'BOOKING_VERIFICATION_REQUIRED';
      }
      throw err;
    }

    const eventIdStr = (booking.eventId as any)._id?.toString() || booking.eventId.toString();

    // Reuse existing PDF / email infrastructure by enqueuing a pdf:generate job
    await QueueService.enqueue(
      getQueueName('pdf-queue'),
      'pdf:generate',
      {
        bookingId: booking._id.toString(),
        eventId: eventIdStr,
        recipientEmail: booking.guestEmail,
        guestName: booking.guestName,
      },
      `pdf:generate:${booking._id}:resend:${Date.now()}` // Bypass BullMQ deduplication
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

// ─────────────────────────────────────────────
// Recover Booking Email
// ─────────────────────────────────────────────

export async function recoverBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { transactionId } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  const maskTransactionId = (id: string): string => {
    if (!id || id.length <= 8) return '****';
    return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
  };

  const maskedTxId = maskTransactionId(transactionId);

  try {
    auditLog({
      action: 'TRANSACTION_RECOVERY_LOOKUP',
      status: 'pending',
      metadata: {
        transactionId: maskedTxId,
        ip,
        userAgent,
      },
      description: `Attempting booking email recovery with transaction ID ${maskedTxId}`,
    });

    const result = await BookingRecoveryService.recoverBookingByTransactionId(transactionId);

    auditLog({
      action: 'TRANSACTION_RECOVERY_SUCCESS',
      status: 'success',
      metadata: {
        transactionId: maskedTxId,
        bookingId: result.bookingId,
        timestamp: new Date().toISOString(),
      },
      description: `Successfully recovered email for booking ${result.bookingId}`,
    });

    res.status(200).json({
      success: true,
      email: result.guestEmail,
    });
  } catch (err: any) {
    const reason = err instanceof AppError ? err.message : (err?.message || 'Unknown error');
    auditLog({
      action: 'TRANSACTION_RECOVERY_NOT_FOUND',
      status: 'failure',
      metadata: {
        transactionId: maskedTxId,
        reason,
      },
      description: `Failed booking email recovery with transaction ID ${maskedTxId}: ${reason}`,
    });

    if (err instanceof AppError && err.statusCode === 404) {
      res.status(404).json({
        success: false,
        message: 'Recovery information not found.',
      });
      return;
    }

    next(err);
  }
}

