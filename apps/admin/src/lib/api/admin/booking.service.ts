import { adminApiClient } from '@/lib/api/client';
import type { PaginatedItemsResponse } from '@mad/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Booking Service');

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

export async function adminGetBookings(params: Record<string, string | number> = {}): Promise<NormalizedBookingsResponse> {
  try {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const { data } = await adminApiClient.get<{
      data: AdminBooking[] | { bookings: AdminBooking[]; pagination?: { page?: number; limit?: number; total?: number; totalPages?: number } };
      pagination?: { page?: number; limit?: number; total?: number; totalPages?: number };
    }>(`/admin/bookings?${qs}`);

    const paginationSource = (data?.data && typeof data.data === 'object' && 'pagination' in data.data ? data.data.pagination : null) || data?.pagination;
    let items: AdminBooking[] = [];
    if (Array.isArray(data?.data)) {
      items = data.data;
    } else if (data?.data && typeof data.data === 'object') {
      if ('bookings' in data.data && Array.isArray(data.data.bookings)) {
        items = data.data.bookings;
      } else {
        const foundArray = Object.values(data.data).find((v): v is AdminBooking[] => Array.isArray(v));
        if (foundArray) {
          items = foundArray;
        }
      }
    }
    return {
      items,
      pagination: {
        page: paginationSource?.page ?? 1,
        limit: paginationSource?.limit ?? 15,
        total: paginationSource?.total ?? 0,
        totalPages: paginationSource?.totalPages ?? 1,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch bookings, returning safe default NormalizedBookingsResponse:', error);
    return {
      items: [],
      pagination: {
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1,
      },
    };
  }
}

export async function adminGetBooking(id: string): Promise<NormalizedBookingDetail> {
  try {
    const { data } = await adminApiClient.get<{ data: AdminBooking }>(`/admin/bookings/${id}`);
    const booking = data?.data;
    if (!booking) throw new Error('Booking not found');

    const customer = booking.userId ?? booking.guestInfo;

    return {
      booking: {
        _id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        mode: booking.mode,
        createdAt: booking.createdAt,
        cancellationReason: booking.cancellationReason,
        cancelledAt: booking.cancelledAt,
      },
      customer: customer ? {
        _id: booking.userId?._id,
        name: customer.name ?? '—',
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email ?? '—',
        phone: customer.phone,
        birthdate: customer.birthdate,
        keepUpdated: customer.keepUpdated,
        sendBestEvents: customer.sendBestEvents,
      } : null,
      tickets: Array.isArray(booking.tickets) ? booking.tickets.map(t => ({
        tierName: t.tierName ?? '—',
        quantity: t.quantity ?? 0,
        price: t.price ?? 0,
      })) : [],
      payment: {
        amount: booking.totalAmount,
        currency: booking.currency,
        status: booking.status,
      },
      event: booking.eventId ? {
        _id: booking.eventId._id,
        title: booking.eventId.title ?? '—',
        startDate: booking.eventId.startDate,
        coverImage: booking.eventId.coverImage,
      } : null,
    };
  } catch (error) {
    logger.error('Failed to fetch booking detail, returning default fallback DTO:', error);
    return {
      booking: null,
      customer: null,
      tickets: [],
      payment: null,
      event: null,
    };
  }
}

export async function adminCancelBooking(id: string, reason?: string, ticketIds?: string[], refundAmount?: number): Promise<void> {
  await adminApiClient.patch(`/admin/bookings/${id}/cancel`, { reason, ticketIds, refundAmount });
}

export async function adminCorrectBookingEmail(id: string, newEmail: string, reason: string): Promise<AdminBooking> {
  const { data } = await adminApiClient.patch<{ data: AdminBooking }>(`/admin/bookings/${id}/correct-email`, {
    newEmail,
    reason,
  });
  return data.data;
}

export async function adminResendBookingTickets(id: string): Promise<void> {
  await adminApiClient.post(`/admin/bookings/${id}/resend`);
}

export interface AdminBookingsSummary {
  totalBookings: number;
  totalTickets: number;
  revenue: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  checkedIn: number;
}

export async function adminGetBookingsSummary(eventId?: string): Promise<AdminBookingsSummary> {
  const qs = new URLSearchParams(eventId ? { eventId } : {});
  const { data } = await adminApiClient.get<{ data: AdminBookingsSummary }>(`/admin/bookings/summary?${qs}`);
  return data.data;
}
