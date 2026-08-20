import { NextFunction, Request, Response } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { buildQrCodeImageUrl, generateAuthorizedTicketQR } from '../../services/public/ticket-ownership.service';
import * as ticketService from '../../services/public/ticket.service';
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
    const { ticketId } = req.params;
    const token = typeof req.query?.token === 'string' ? req.query.token : undefined;
    const qrBuffer = await generateAuthorizedTicketQR(ticketId, {
      token,
      userId: req.user?.sub,
      sessionId: req.session?.sessionId,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(qrBuffer);
  } catch (error) {
    next(error);
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

    res.status(200).json({
      success: true,
      data: { tickets: tokenizedTickets },
      message: 'My tickets retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
}
