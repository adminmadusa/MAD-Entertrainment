import { adminApiClient } from '@/lib/api/client';
import { Notification, PaginatedDataResponse } from '@mad/types';

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

export type WebhookPaginatedResponse = PaginatedDataResponse<WebhookDiagnosticsRow>;

export async function adminGetWebhooks(params: { page?: number; limit?: number; provider?: string; status?: string }): Promise<WebhookPaginatedResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.provider) qs.set('provider', params.provider);
  if (params.status) qs.set('status', params.status);
  
  const { data } = await adminApiClient.get<WebhookPaginatedResponse>(`/admin/webhooks?${qs}`);
  return data;
}

export interface EmailDiagnosticsRow extends Omit<Notification, 'bookingId' | 'eventId'> {
  status?: 'queued' | 'processing' | 'sent' | 'failed';
  jobId?: string;
  errorMessage?: string;
  queuedAt?: string;
  processedAt?: string;
  bookingId?: { _id: string; bookingId: string } | null;
  eventId?: { _id: string; title: string } | null;
}

export type EmailPaginatedResponse = PaginatedDataResponse<EmailDiagnosticsRow>;

export async function adminGetEmailLogs(params: { page?: number; limit?: number; sent?: string }): Promise<EmailPaginatedResponse> {
  const qs = new URLSearchParams();
  qs.set('channel', 'email');
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.sent) qs.set('sent', params.sent);
  
  const { data } = await adminApiClient.get<{
    data: EmailDiagnosticsRow[];
    pagination: EmailPaginatedResponse['pagination'];
  }>(`/admin/notifications?${qs}`);
  return {
    data: data?.data || [],
    pagination: {
      page: data?.pagination?.page ?? 1,
      limit: data?.pagination?.limit ?? 50,
      total: data?.pagination?.total ?? 0,
      totalPages: data?.pagination?.totalPages ?? 1,
    }
  };
}

export interface DeadLetterJobMetadata {
  _id: string;
  queueName: string;
  jobId: string;
  jobName: string;
  attemptsMade: number;
  failedReason?: string;
  processedAt: string;
}

export interface DeadLetterJobDetails extends DeadLetterJobMetadata {
  data: any;
  stacktrace?: string[];
}

export interface DlqPaginatedResponse {
  data: DeadLetterJobMetadata[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SystemHealthReport {
  timestamp: string;
  database: {
    state: string;
    readyState: number;
    connectionsCount: number;
  };
  redis: {
    connected: boolean;
  };
  queues: {
    name: string;
    active: number;
    waiting: number;
    delayed: number;
    failed: number;
    completed: number;
    oldestWaitingJobAgeMs: number;
  }[];
  dlq: {
    totalFailedCount: number;
  };
  sockets: {
    initialized: boolean;
    connectedClients: number;
    adminClients: number;
    emitsCount: Record<string, number>;
    emitFailures: Record<string, number>;
    skippedEmits: Record<string, number>;
  };
}

export async function adminGetDlqJobs(params: {
  page?: number;
  limit?: number;
  queueName?: string;
  search?: string;
}): Promise<DlqPaginatedResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.queueName) qs.set('queueName', params.queueName);
  if (params.search) qs.set('search', params.search);

  const { data } = await adminApiClient.get<DlqPaginatedResponse>(`/admin/diagnostics/dlq?${qs}`);
  return data;
}

export async function adminGetDlqJobPayload(id: string): Promise<DeadLetterJobDetails> {
  const { data } = await adminApiClient.get<{ data: DeadLetterJobDetails }>(`/admin/diagnostics/dlq/${id}`);
  return data.data;
}

export async function adminRetryDlqJob(id: string): Promise<void> {
  await adminApiClient.post(`/admin/diagnostics/dlq/${id}/retry`);
}

export async function adminRetryAllDlqJobs(): Promise<{ successCount: number; failedCount: number }> {
  const { data } = await adminApiClient.post<{ data: { successCount: number; failedCount: number } }>('/admin/diagnostics/dlq/retry-all');
  return data.data;
}

export async function adminGetSystemHealth(): Promise<SystemHealthReport> {
  const { data } = await adminApiClient.get<{ data: SystemHealthReport }>('/admin/diagnostics/system');
  return data.data;
}

