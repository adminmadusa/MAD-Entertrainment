import type { RefundStatus } from '@mad/shared';
import type { PaginatedItemsResponse } from './common.types';

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface AdminTier {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  defaultVisibility?: boolean;
  sortIndex?: number;
  createdAt: string;
}

export interface AdminBooking {
  _id: string;
  bookingId: string;
  status: string;
  totalAmount: number;
  currency: string;
  mode: string;
  eventId?: { _id: string; title: string; startDate: string; venue?: string; coverImage?: { url: string } } | null;
  userId?: {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    birthdate?: string;
    keepUpdated?: boolean;
    sendBestEvents?: boolean;
  } | null;
  guestInfo?: {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
    birthdate?: string;
    keepUpdated?: boolean;
    sendBestEvents?: boolean;
  };
  tickets: { tierName: string; quantity: number; price: number }[];
  createdAt: string;
  cancellationReason?: string;
  cancelledAt?: string;
  totalTickets?: number;
  ticketsScanned?: number;
  ticketsRemaining?: number;
  attendanceStatus?: 'NOT_ATTENDED' | 'PARTIALLY_ATTENDED' | 'FULLY_ATTENDED';
  auditHistory?: {
    action: string;
    actor: string;
    status: string;
    timestamp: string;
    metadata: Record<string, unknown>;
    description: string;
  }[];
  individualTickets?: {
    ticketId: string;
    status: string;
    createdAt: string;
    replacedAt?: string | null;
    replacedByTicketId?: string | null;
    replacementReason?: string | null;
  }[];
}

export type NormalizedBookingsResponse = PaginatedItemsResponse<AdminBooking>;

export interface EventSummary {
  _id: string;
  title: string;
  startDate: string;
  coverImage?: { url: string };
}

export interface CustomerSummary {
  _id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  birthdate?: string;
  keepUpdated?: boolean;
  sendBestEvents?: boolean;
}

export interface TicketSummary {
  tierName: string;
  quantity: number;
  price: number;
}

export interface PaymentSummary {
  amount: number;
  currency: string;
  status: string;
}

export interface NormalizedBookingDetail {
  booking: {
    _id: string;
    bookingId: string;
    status: string;
    totalAmount: number;
    currency: string;
    mode: string;
    createdAt: string;
    cancellationReason?: string;
    cancelledAt?: string;
  } | null;
  customer: CustomerSummary | null;
  tickets: TicketSummary[];
  payment: PaymentSummary | null;
  event: EventSummary | null;
}

export interface BookingsSummaryResponse {
  totalBookings: number;
  totalTickets: number;
  revenue: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  checkedIn: number;
}

export type AdminBookingsSummary = BookingsSummaryResponse;

export interface AdminRefund {
  _id: string;
  bookingId: AdminBooking;
  paymentId: {
    _id: string;
    amount: number;
    gateway: string;
    gatewayPaymentId?: string;
  };
  ticketIds?: string[];
  amount: number;
  currency: string;
  reason?: string;
  status: RefundStatus | 'requested' | 'processing' | 'completed' | 'failed';
  adminNotes?: string;
  gatewayRefundId?: string;
  createdAt: string;
  processedAt?: string;
}

export type NormalizedRefundsResponse = PaginatedItemsResponse<AdminRefund>;
