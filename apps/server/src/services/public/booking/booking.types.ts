import { IBooking } from '../../../models/booking.schema';
import { ITicket } from '../../../models/ticket.schema';

export interface BookingQueryResult {
  booking: IBooking;
  tickets: ITicket[];
  ticketsReady: boolean;
}

export interface MyBookingsResult {
  bookings: IBooking[];
  tickets: ITicket[];
  ticketsReadyMap: Record<string, boolean>;
}

export interface BookingAccessContext {
  userId?: string;
  sessionId?: string;
}
