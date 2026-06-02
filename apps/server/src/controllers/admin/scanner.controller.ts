import { Request, Response, NextFunction } from 'express';
import { Ticket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';

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
        details: {
          scannedAt: ticket.scannedAt.toISOString(),
        },
      });
    }

    const booking = await Booking.findById(ticket.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Invalid ticket reference: Associated booking not found.',
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Booking is ${booking.status.toUpperCase()}. Only confirmed bookings can be scanned.`,
      });
    }

    // Atomically check-in the ticket
    const updatedTicket = await Ticket.findOneAndUpdate(
      { _id: ticket._id, $or: [{ scannedAt: { $exists: false } }, { scannedAt: null }] },
      { $set: { scannedAt: new Date() } },
      { new: true }
    );

    if (!updatedTicket) {
      const alreadyCheckedTicket = await Ticket.findById(ticket._id);
      return res.status(400).json({
        success: false,
        message: `Ticket already used: Checked in at ${alreadyCheckedTicket?.scannedAt ? new Date(alreadyCheckedTicket.scannedAt).toLocaleTimeString('en-IN') : 'an unknown time'} on ${alreadyCheckedTicket?.scannedAt ? new Date(alreadyCheckedTicket.scannedAt).toLocaleDateString('en-IN') : 'an unknown date'}.`,
        details: {
          scannedAt: alreadyCheckedTicket?.scannedAt
            ? alreadyCheckedTicket.scannedAt.toISOString()
            : new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Ticket scanned and verified successfully.',
      data: {
        ticketId: updatedTicket.ticketId,
        tierName: updatedTicket.tierName,
        admits: updatedTicket.admits || 1,
        scannedAt: updatedTicket.scannedAt?.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const lookupTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reference } = req.params;
    const { eventId } = req.query;

    if (!reference || !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Both reference and eventId are required parameters.',
      });
    }

    if (reference.startsWith('MAD-')) {
      const booking = await Booking.findOne({ bookingId: reference });
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking reference not found.',
        });
      }

      const tickets = await Ticket.find({ bookingId: booking._id, eventId });
      if (!tickets.length) {
        // If booking is confirmed but no tickets exist yet, the background worker
        // is still generating them. Return 202 so the caller can retry gracefully.
        if (booking.status === 'confirmed') {
          return res.status(202).json({
            success: false,
            status: 'generating',
            message: 'Tickets are being generated. Please try again in a moment.',
          });
        }
        return res.status(404).json({
          success: false,
          message: 'No tickets found for this booking for the selected event.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          booking: {
            bookingId: booking.bookingId,
            status: booking.status,
            guestName: booking.guestName,
          },
          tickets: tickets.map(t => ({
            ticketId: t.ticketId,
            tierName: t.tierName,
            admits: t.admits,
            scannedAt: t.scannedAt ? t.scannedAt.toISOString() : null,
          })),
        },
      });
    } else {
      const ticket = await Ticket.findOne({ ticketId: reference, eventId });
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          tickets: [
            {
              ticketId: ticket.ticketId,
              tierName: ticket.tierName,
              admits: ticket.admits,
              scannedAt: ticket.scannedAt ? ticket.scannedAt.toISOString() : null,
            },
          ],
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
