import { adminApiClient } from '@/lib/api/client';

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};


export interface AdminBooking {
  _id: string;
  bookingId: string;
  status: string;
  totalAmount: number;
  currency: string;
  mode: string;
  eventId?: { _id: string; title: string; startDate: string; coverImage?: { url: string } } | null;
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
}

export interface AdminRefund {
  _id: string;
  bookingId: { _id: string; bookingId: string } | string;
  paymentId: { _id: string; amount: number; gateway: string } | string;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  adminNotes?: string;
  gatewayRefundId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface NormalizedBookingsResponse {
  items: AdminBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await adminApiClient.get<any>(`/admin/bookings?${qs}`);
     
    const paginationSource = data?.data?.pagination || data?.pagination;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: Array.isArray(data?.data) ? data.data : (data?.data && Object.values(data.data).find((v: any) => Array.isArray(v)) || []),
      pagination: {
        page: paginationSource?.page ?? 1,
        limit: paginationSource?.limit ?? 15,
        total: paginationSource?.total ?? 0,
        totalPages: paginationSource?.totalPages ?? 1,
      },
    };
  } catch (error) {
    console.error('[Booking Service] Failed to fetch bookings, returning safe default NormalizedBookingsResponse:', error);
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
    console.error('[Booking Detail Service] Failed to fetch booking detail, returning default fallback DTO:', error);
    return {
      booking: null,
      customer: null,
      tickets: [],
      payment: null,
      event: null,
    };
  }
}

export async function adminCancelBooking(id: string, reason?: string): Promise<void> {
  await adminApiClient.patch(`/admin/bookings/${id}/cancel`, { reason });
}

export interface NormalizedRefundsResponse {
  items: AdminRefund[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetRefunds(params: Record<string, string> = {}): Promise<NormalizedRefundsResponse> {
  try {
    const qs = new URLSearchParams(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await adminApiClient.get<any>(`/admin/refunds?${qs}`);
     
    const paginationSource = data?.data?.pagination || data?.pagination;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: Array.isArray(data?.data) ? data.data : (data?.data && Object.values(data.data).find((v: any) => Array.isArray(v)) || []),
      pagination: {
        page: paginationSource?.page ?? 1,
        limit: paginationSource?.limit ?? 15,
        total: paginationSource?.total ?? 0,
        totalPages: paginationSource?.totalPages ?? 1,
      },
    };
  } catch (error) {
    console.error('[Booking Service] Failed to fetch refunds, returning safe default NormalizedRefundsResponse:', error);
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

export async function adminProcessRefund(id: string, action: 'approve' | 'reject', adminNotes?: string, gatewayRefundId?: string): Promise<void> {
  await adminApiClient.patch(`/admin/refunds/${id}/process`, { action, adminNotes, gatewayRefundId });
}

export async function adminCreateRefund(payload: { bookingId: string; paymentId: string; amount: number; reason?: string }): Promise<AdminRefund> {
  const { data } = await adminApiClient.post<{ data: AdminRefund }>('/admin/refunds', payload);
  return data.data;
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
