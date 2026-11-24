import type { BookingStatus, TicketTier } from '@mad/shared';

export type Booking = {
  _id?: string;
  bookingId: string;
  eventId: string;
  userId?: string;
  guestName?: string;
  firstName?: string;
  lastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  birthdate?: string | Date;
  keepUpdated?: boolean;
  sendBestEvents?: boolean;
  sessionId?: string;
  tickets: {
    tier: TicketTier;
    tierName: string;
    quantity: number;
    pricePerTicket: number;
    subtotal: number;
    seats?: {
      seatId: string;
      row: string;
      number: number;
      section?: string;
    }[];
  }[];
  totalTickets: number;
  subtotal: number;
  convenienceFee: number;
  gst: number;
  discount: number;
  totalAmount: number;
  currency: string;
  countryCode?: string;
  taxLabel?: string;
  taxPercentage?: number;
  locale?: string;
  couponCode?: string;
  couponId?: string;
  status: BookingStatus;
  paymentId?: string;
  reservationIds?: string[];
  bookingVersion: number;
  expiresAt?: string | Date;
  logicalExpiresAt?: string | Date;
  cancellationReason?: string;
  cancelledAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type Ticket = {
  _id?: string;
  ticketId: string;
  bookingId: string;
  eventId: string;
  userId?: string;
  attendeeUserId?: string;
  attendeeEmail?: string;
  tier: TicketTier;
  tierName: string;
  admits?: number;
  price?: number;
  seatId?: string;
  row?: string;
  seatNumber?: number;
  section?: string;
  guestName?: string;
  guestEmail?: string;
  qrCode?: string;
  qrCodeImage?: string;
  status: 'active' | 'voided' | 'replaced' | string;
  assignmentStatus?: 'unassigned' | 'pending' | 'claimed';
  claimedAt?: string | Date;
  scannedAt?: string | Date;
  scannedById?: string;
  /** @deprecated Use scannedAt */
  checkedInAt?: string | Date;
  /** @deprecated Use scannedById */
  checkedInBy?: string;
  replacedByTicketId?: string;
  replacedAt?: string | Date;
  replacementReason?: 'EMAIL_CORRECTION' | 'ADMIN_REISSUE' | 'FRAUD_PREVENTION' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
