import { Admin } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface AdminsResponse {
  data: Admin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NormalizedAdminsResponse {
  items: Admin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetAdmins(page = 1, limit = 15): Promise<NormalizedAdminsResponse> {
  try {
    const { data } = await adminApiClient.get<AdminsResponse>(`/admin/team?page=${page}&limit=${limit}`);
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
    console.error('[Team Service] Failed to fetch team members, returning safe default NormalizedAdminsResponse:', error);
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

export async function adminCreateAdmin(payload: Record<string, unknown>): Promise<Admin | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Admin }>('/admin/team', payload);
    return data.data;
  } catch (error) {
    console.error('[Team Service] Failed to invite team member:', error);
    throw error;
  }
}

export async function adminToggleAdminActive(id: string): Promise<{ isActive: boolean } | null> {
  try {
    const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/team/${id}/toggle`);
    return data.data;
  } catch (error) {
    console.error(`[Team Service] Failed to toggle active status for team member ${id}:`, error);
    throw error;
  }
}
