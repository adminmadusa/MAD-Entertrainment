import { DJOperator } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface DJsResponse {
  data: DJOperator[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DJFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export async function adminGetDJs(filters: DJFilters = {}): Promise<DJsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      params.set(k, String(v));
    }
  });
  const { data } = await adminApiClient.get<DJsResponse>(`/admin/dj-operators?${params}`);
  return data;
}

export async function adminGetDJ(id: string): Promise<DJOperator> {
  const { data } = await adminApiClient.get<{ data: DJOperator }>(`/admin/dj-operators/${id}`);
  return data.data;
}

export async function adminCreateDJ(payload: Partial<DJOperator>): Promise<DJOperator> {
  const { data } = await adminApiClient.post<{ data: DJOperator }>('/admin/dj-operators', payload);
  return data.data;
}

export async function adminUpdateDJ(id: string, payload: Partial<DJOperator>): Promise<DJOperator> {
  const { data } = await adminApiClient.put<{ data: DJOperator }>(`/admin/dj-operators/${id}`, payload);
  return data.data;
}

export async function adminDeleteDJ(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/dj-operators/${id}`);
}
