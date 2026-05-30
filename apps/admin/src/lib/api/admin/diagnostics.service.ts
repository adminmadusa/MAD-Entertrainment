import { adminApiClient } from '@/lib/api/client';

export interface ConsistencyReport {
  generatedAt: string;
  counts: {
    activeReservations: number;
    expiredReservations: number;
    redisLocks: number;
    awaitingPaymentBookings: number;
    orphanPayments: number;
  };
  drift: {
    staleSeatReservations: number;
    phantomRedisLocks: number;
    eventInventoryMismatches: number;
  };
  repairs?: {
    expiredReservations: number;
    phantomRedisLocks: number;
    staleSeatReservations: number;
  };
}

export interface ReservationDiagnosticsRow {
  _id: string;
  reservationId: string;
  eventId: string;
  seatId?: string;
  section?: string;
  quantity: number;
  status: string;
  inventoryState: string;
  expiresAt: string;
  bookingReference?: string;
  paymentReference?: string;
  reservationVersion: number;
  eventVersion: number;
  seatVersion: number;
  updatedAt: string;
}

export async function adminGetConsistencyReport(): Promise<ConsistencyReport> {
  const { data } = await adminApiClient.get<{ data: ConsistencyReport }>('/admin/diagnostics/consistency');
  return data.data;
}

export async function adminRepairConsistency(): Promise<ConsistencyReport> {
  const { data } = await adminApiClient.post<{ data: ConsistencyReport }>('/admin/diagnostics/consistency/repair');
  return data.data;
}

export async function adminGetReservations(status?: string): Promise<ReservationDiagnosticsRow[]> {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  const { data } = await adminApiClient.get<{ data: ReservationDiagnosticsRow[] }>(`/admin/diagnostics/reservations?${qs}`);
  return data.data;
}

export interface WebhookDiagnosticsRow {
  _id: string;
  eventId: string;
  provider: string;
  eventType?: string;
  status: string;
  errorMessage?: string;
  receivedAt: string;
  bookingId?: string | { bookingId: string };
}

export interface WebhookPaginatedResponse {
  data: WebhookDiagnosticsRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetWebhooks(params: { page?: number; limit?: number; provider?: string; status?: string }): Promise<WebhookPaginatedResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.provider) qs.set('provider', params.provider);
  if (params.status) qs.set('status', params.status);
  
  const { data } = await adminApiClient.get<WebhookPaginatedResponse>(`/admin/webhooks?${qs}`);
  return data;
}
