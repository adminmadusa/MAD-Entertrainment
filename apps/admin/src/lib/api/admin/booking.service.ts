import { adminApiClient } from '@/lib/api/client';

export interface AdminBooking {
  _id: string;
  bookingId: string;
  status: string;
  totalAmount: number;
  currency: string;
  mode: string;
  eventId?: { _id: string; title: string; startDate: string; coverImage?: { url: string } } | null;
  userId?: { _id: string; name: string; email: string; phone?: string } | null;
  guestInfo?: { name: string; email: string; phone: string };
  tickets: { tierName: string; quantity: number; price: number }[];
  createdAt: string;
  cancellationReason?: string;
  cancelledAt?: string;
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

type PaginatedResponse<T> = { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

export async function adminGetBookings(params: Record<string, string | number> = {}): Promise<PaginatedResponse<AdminBooking>> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const { data } = await adminApiClient.get<PaginatedResponse<AdminBooking>>(`/admin/bookings?${qs}`);
  return data;
}

export async function adminGetBooking(id: string): Promise<AdminBooking> {
  const { data } = await adminApiClient.get<{ data: AdminBooking }>(`/admin/bookings/${id}`);
  return data.data;
}

export async function adminCancelBooking(id: string, reason?: string): Promise<void> {
  await adminApiClient.patch(`/admin/bookings/${id}/cancel`, { reason });
}

export async function adminGetRefunds(params: Record<string, string> = {}): Promise<PaginatedResponse<AdminRefund>> {
  const qs = new URLSearchParams(params);
  const { data } = await adminApiClient.get<PaginatedResponse<AdminRefund>>(`/admin/refunds?${qs}`);
  return data;
}

export async function adminProcessRefund(id: string, action: 'approve' | 'reject', adminNotes?: string, gatewayRefundId?: string): Promise<void> {
  await adminApiClient.patch(`/admin/refunds/${id}/process`, { action, adminNotes, gatewayRefundId });
}

export async function adminCreateRefund(payload: { bookingId: string; paymentId: string; amount: number; reason?: string }): Promise<AdminRefund> {
  const { data } = await adminApiClient.post<{ data: AdminRefund }>('/admin/refunds', payload);
  return data.data;
}
