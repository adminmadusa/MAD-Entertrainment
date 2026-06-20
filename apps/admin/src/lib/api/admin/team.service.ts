import { Admin, PaginatedDataResponse, PaginatedItemsResponse } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export type AdminsResponse = PaginatedDataResponse<Admin>;

export type NormalizedAdminsResponse = PaginatedItemsResponse<Admin>;


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

export async function adminUpdateAdmin(id: string, payload: { name: string; email: string }): Promise<Admin | null> {
  try {
    const { data } = await adminApiClient.patch<{ data: Admin }>(`/admin/team/${id}`, payload);
    return data.data;
  } catch (error) {
    console.error(`[Team Service] Failed to update administrative details for ${id}:`, error);
    throw error;
  }
}

export async function adminUpdateAdminRole(id: string, role: string): Promise<Admin | null> {
  try {
    const { data } = await adminApiClient.patch<{ data: Admin }>(`/admin/team/${id}/role`, { role });
    return data.data;
  } catch (error) {
    console.error(`[Team Service] Failed to update role for administrative account ${id}:`, error);
    throw error;
  }
}

export async function adminResetAdminPassword(id: string, payload: Record<string, unknown>): Promise<Admin | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Admin }>(`/admin/team/${id}/reset-password`, payload);
    return data.data;
  } catch (error) {
    console.error(`[Team Service] Failed to reset password for administrative account ${id}:`, error);
    throw error;
  }
}
