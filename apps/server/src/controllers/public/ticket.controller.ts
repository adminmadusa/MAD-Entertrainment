import { NextFunction, Request, Response } from 'express';
import qrcode from 'qrcode';

import { BookingStatus } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { canViewTicketQR, buildQrCodeImageUrl, verifyTicketQrToken } from '../../services/public/ticket-ownership.service';
import * as ticketService from '../../services/public/ticket.service';
import { logger } from '../../utils/logger';
import { sendSuccess } from '../../utils/response';

/**
 * GET /api/public/tickets/:ticketId/qr
 * Generates and returns a PNG QR code buffer for the specified ticketId.
 * Enforces strict browser-level immutable caching and ownership authorization.
 */
export async function getTicketQR(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawTicketId = req.params?.ticketId;
    if (typeof rawTicketId !== 'string' || !rawTicketId.trim()) {
      throw AppError.badRequest('Ticket ID is required');
    }
    const ticketId = String(rawTicketId).trim();

    // 1. Validate ticket existence in DB
    const ticket = await Ticket.findOne({ ticketId }).lean();
    if (!ticket) {
      logger.warn({ ticketId }, 'Attempted QR fetch for non-existent ticket');
      throw AppError.notFound('Ticket not found');
    }

    if (ticket.status !== 'active') {
      throw AppError.forbidden('Ticket is no longer active');
    }

    const booking = await Booking.findById(ticket.bookingId).lean();
    if (!booking) {
      throw AppError.notFound('Associated booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw AppError.forbidden('Associated booking is not confirmed');
    }

    // 2. Validate ticket visibility using token or canViewTicketQR
    const rawToken = req.query?.token;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    const hasValidToken = token.length > 0 && verifyTicketQrToken(ticketId, token);
    const hasOwnerAccess = hasValidToken ? true : await canViewTicketQR(ticket, req.user?.sub, req.session?.sessionId);

    if (!hasValidToken && !hasOwnerAccess) {
      throw AppError.forbidden('You do not have permission to view this QR code');
    }

    // 3. Generate QR code as a PNG buffer using local 'qrcode' package
    const qrContent = ticket.qrCode || ticket.ticketId;
    const qrBuffer = await qrcode.toBuffer(qrContent, {
      type: 'png',
      margin: 1,
      width: 300,
    });

    // 4. Set immutable caching headers & content type
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // 5. Send the image buffer
    res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/tickets/:ticketId/assign
 * Body: { email: string }
 */
export async function assignTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ticketId } = req.params;
    const { email } = req.body;

    if (!email) {
      throw AppError.badRequest('Attendee email is required');
    }

    if (!req.user?.sub) {
      throw AppError.unauthorized('Authentication required');
    }

    await ticketService.assignTicket(ticketId, req.user.sub, email);

    sendSuccess(res, null, 'Ticket assigned successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/tickets/:ticketId/claim
 */
export async function claimTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ticketId } = req.params;

    if (!req.user?.sub || !req.user?.email) {
      throw AppError.unauthorized('Authentication required');
    }

    await ticketService.claimTicket(ticketId, req.user.sub, req.user.email);

    sendSuccess(res, null, 'Ticket claimed successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/tickets/:ticketId/revoke
 */
export async function revokeTicket(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ticketId } = req.params;

    if (!req.user?.sub) {
      throw AppError.unauthorized('Authentication required');
    }

    await ticketService.revokeTicket(ticketId, req.user.sub);

    sendSuccess(res, null, 'Ticket reassignment reset successful');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/tickets/my-tickets
 */
export async function getMyTickets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.sub) {
      throw AppError.unauthorized('Authentication required');
    }

    const tickets = await ticketService.getAttendeeTickets(req.user.sub);

    const tokenizedTickets = tickets.map((t: any) => {
      const ticketObj = typeof t.toObject === 'function' ? t.toObject() : t;
      ticketObj.qrCodeImage = buildQrCodeImageUrl(ticketObj.ticketId);
      return ticketObj;
    });

    sendSuccess(res, { tickets: tokenizedTickets }, 'My tickets retrieved successfully');
  } catch (err) {
    next(err);
  }
}
