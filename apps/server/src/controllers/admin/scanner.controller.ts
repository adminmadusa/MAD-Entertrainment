import { Request, Response, NextFunction } from 'express';
import { Ticket } from '../../models/ticket.schema';

export const scanTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticketId, eventId } = req.body;

    if (!ticketId || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Both ticketId and eventId are required parameters.',
      });
    }

    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Invalid ticket reference: Ticket not found.',
      });
    }

    if (String(ticket.eventId) !== String(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: This ticket is registered for a different event.',
      });
    }

    if (ticket.scannedAt) {
      return res.status(400).json({
        success: false,
        message: `Ticket already used: Checked in at ${new Date(ticket.scannedAt).toLocaleTimeString('en-IN')} on ${new Date(ticket.scannedAt).toLocaleDateString('en-IN')}.`,
      });
    }

    // Atomically check-in the ticket
    ticket.scannedAt = new Date();
    await ticket.save();

    res.status(200).json({
      status: 'success',
      message: 'Ticket scanned and verified successfully.',
      data: {
        ticketId: ticket.ticketId,
        tierName: ticket.tierName,
        admits: ticket.admits || 1,
        scannedAt: ticket.scannedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
