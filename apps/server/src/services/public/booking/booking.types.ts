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

export interface CreateBookingRequest {
  eventId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  tickets: {
    tier: string;
    quantity: number;
    seats?: {
      seatId: string;
      row: string;
      number: number;
      section?: string;
    }[];
  }[];
  couponCode?: string;
}

export interface SaveCheckoutRequest {
  firstName: string;
  lastName: string;
  guestEmail: string;
  guestPhone: string;
  keepUpdated?: boolean;
  sendBestEvents?: boolean;
}
