import { adminApiClient } from '@/lib/api/client';
import type { Notification, PaginatedDataResponse, PaginatedItemsResponse } from '@mad/types';

export type NotificationsResponse = PaginatedDataResponse<Notification>;

export type NormalizedNotificationsResponse = PaginatedItemsResponse<Notification>;


export interface NotificationFilters {
  page?: number;
  limit?: number;
  sent?: string;
  channel?: string;
}

export async function adminGetNotifications(filters: NotificationFilters = {}): Promise<NormalizedNotificationsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<NotificationsResponse>(`/admin/notifications?${params}`);
    return {
      items: Array.isArray(data?.data) ? data.data : (data?.data && Object.values(data.data).find(v => Array.isArray(v)) || []),
      pagination: {
        page: data?.pagination?.page ?? 1,
        limit: data?.pagination?.limit ?? 15,
        total: data?.pagination?.total ?? 0,
        totalPages: data?.pagination?.totalPages ?? 1,
      },
    };
  } catch (error) {
    console.error('[Notification Service] Failed to fetch notifications, returning safe default NormalizedNotificationsResponse:', error);
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

export async function adminRetryNotification(id: string): Promise<Notification | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Notification }>(`/admin/notifications/${id}/retry`);
    return data.data;
  } catch (error) {
    console.error(`[Notification Service] Failed to retry notification ${id}:`, error);
    return null;
  }
}
