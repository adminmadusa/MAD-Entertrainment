import { Notification } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface NotificationsResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  sent?: string;
  channel?: string;
}

export async function adminGetNotifications(filters: NotificationFilters = {}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      params.set(k, String(v));
    }
  });
  const { data } = await adminApiClient.get<NotificationsResponse>(`/admin/notifications?${params}`);
  return data;
}

export async function adminRetryNotification(id: string): Promise<Notification> {
  const { data } = await adminApiClient.post<{ data: Notification }>(`/admin/notifications/${id}/retry`);
  return data.data;
}
