import { Types } from 'mongoose';

import { BookingStatus } from '@mad/shared';

import { AppError } from '../../../middleware/error.middleware';
import { Booking, type IBooking } from '../../../models/booking.schema';
import { Ticket } from '../../../models/ticket.schema';
import { UserModel } from '../../../models/user.schema';
import type { BookingQueryResult, MyBookingsResult, BookingAccessContext } from './booking.types';

export class BookingQueryService {
  static async getBookingByReference(bookingId: string): Promise<BookingQueryResult> {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { bookingId };
    const booking = await Booking.findOne(query)
      .populate('eventId')
      .populate('paymentId');

    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const tickets = await Ticket.find({ bookingId: booking._id, status: 'active' });

    const ticketsReady = tickets.length > 0 && tickets.length === booking.totalTickets;

    return { booking, tickets, ticketsReady };
  }

  static async getMyBookings(
    auth: BookingAccessContext | string
  ): Promise<MyBookingsResult> {
    const userId = typeof auth === 'string' ? auth : auth.userId;
    const sessionId = typeof auth === 'string' ? undefined : auth.sessionId;

    let bookings: IBooking[] = [];

    if (userId) {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw AppError.notFound('User not found');
      }

      bookings = await Booking.find({
        $or: [
          { userId: user._id },
          { guestEmail: user.email.trim().toLowerCase(), status: BookingStatus.CONFIRMED },
        ],
      })
        .populate('eventId')
        .sort({ createdAt: -1 });
    } else if (sessionId) {
      bookings = await Booking.find({
        sessionId,
        status: BookingStatus.CONFIRMED,
      })
        .populate('eventId')
        .sort({ createdAt: -1 });
    } else {
      throw AppError.unauthorized('Authentication or guest session required');
    }

    const bookingIds = bookings.map((b) => b._id);
    const tickets = await Ticket.find({ bookingId: { $in: bookingIds }, status: 'active' });

    // Compute per-booking readiness for the caller
    const ticketsReadyMap: Record<string, boolean> = {};
    for (const booking of bookings) {
      const bookingTickets = tickets.filter(
        (t) => t.bookingId?.toString() === booking._id.toString()
      );
      ticketsReadyMap[booking._id.toString()] =
        bookingTickets.length > 0 && bookingTickets.length === booking.totalTickets;
    }

    Object.defineProperty(ticketsReadyMap, 'get', {
      value: function (key: string) {
        return (this as any)[key];
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });

    return { bookings, tickets, ticketsReadyMap };
  }
}
