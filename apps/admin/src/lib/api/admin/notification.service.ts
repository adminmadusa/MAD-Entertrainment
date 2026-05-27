import { Notification } from "@mad/types";

import { adminApiClient } from "@/lib/api/client";

export interface NotificationsResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NormalizedNotificationsResponse {
  items: Notification[];
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

export async function adminGetNotifications(
  filters: NotificationFilters = {},
): Promise<NormalizedNotificationsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<NotificationsResponse>(
      `/admin/notifications?${params}`,
    );
    return {
      items: Array.isArray(data?.data)
        ? data.data
        : (data?.data &&
            Object.values(data.data).find((v) => Array.isArray(v))) ||
          [],
      pagination: {
        page: data?.pagination?.page ?? 1,
        limit: data?.pagination?.limit ?? 15,
        total: data?.pagination?.total ?? 0,
        totalPages: data?.pagination?.totalPages ?? 1,
      },
    };
  } catch (error) {
    console.error(
      "[Notification Service] Failed to fetch notifications, returning safe default NormalizedNotificationsResponse:",
      error,
    );
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

export async function adminRetryNotification(
  id: string,
): Promise<Notification | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Notification }>(
      `/admin/notifications/${id}/retry`,
    );
    return data.data;
  } catch (error) {
    console.error(
      `[Notification Service] Failed to retry notification ${id}:`,
      error,
    );
    return null;
  }
}
