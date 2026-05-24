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

export async function adminGetAdmins(page = 1, limit = 15): Promise<AdminsResponse> {
  const { data } = await adminApiClient.get<AdminsResponse>(`/admin/team?page=${page}&limit=${limit}`);
  return data;
}

export async function adminCreateAdmin(payload: Record<string, unknown>): Promise<Admin> {
  const { data } = await adminApiClient.post<{ data: Admin }>('/admin/team', payload);
  return data.data;
}

export async function adminToggleAdminActive(id: string): Promise<{ isActive: boolean }> {
  const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/team/${id}/toggle`);
  return data.data;
}
