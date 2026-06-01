import { NextFunction, Request, Response } from 'express';
import qrcode from 'qrcode';

import { AppError } from '../../middleware/error.middleware';
import { Ticket } from '../../models/ticket.schema';
import { logger } from '../../utils/logger';

/**
 * GET /api/public/tickets/:ticketId/qr
 * Generates and returns a PNG QR code buffer for the specified ticketId.
 * Enforces strict browser-level immutable caching.
 */
export async function getTicketQR(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      throw AppError.badRequest('Ticket ID is required');
    }

    // 1. Validate ticket existence in DB
    const ticket = await Ticket.findOne({ ticketId }).lean();
    if (!ticket) {
      logger.warn({ ticketId }, 'Attempted QR fetch for non-existent ticket');
      throw AppError.notFound('Ticket not found');
    }

    // 2. Generate QR code as a PNG buffer using local 'qrcode' package
    const qrContent = ticket.qrCode || ticket.ticketId;
    const qrBuffer = await qrcode.toBuffer(qrContent, {
      type: 'png',
      margin: 1,
      width: 300,
    });

    // 3. Set immutable caching headers & content type
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // 4. Send the image buffer
    res.send(qrBuffer);
  } catch (err) {
    next(err);
  }
}
