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

export interface NormalizedDJsResponse {
  items: DJOperator[];
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

export async function adminGetDJs(filters: DJFilters = {}): Promise<NormalizedDJsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<any>(`/admin/dj-operators?${params}`);
    const payload = data?.data;
    const paginationSource = data?.pagination || payload?.pagination || payload;
    return {
      items: Array.isArray(payload) ? payload : (payload && Object.values(payload).find(v => Array.isArray(v)) || []),
      pagination: {
        page: paginationSource?.page ?? Number(filters.page) ?? 1,
        limit: paginationSource?.limit ?? Number(filters.limit) ?? 15,
        total: paginationSource?.total ?? 0,
        totalPages: paginationSource?.totalPages ?? paginationSource?.pages ?? 1,
      },
    };
  } catch (error) {
    console.error('[DJ Service] Failed to fetch DJ Operators, returning safe default NormalizedDJsResponse:', error);
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

export async function adminGetDJ(id: string): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.get<{ data: Record<string, unknown> | DJOperator }>(`/admin/dj-operators/${id}`);
    const payload = data?.data;
    if (!payload) return null;
    if ('djOperator' in payload && payload.djOperator) {
      return payload.djOperator as DJOperator;
    }
    if ('dj' in payload && payload.dj) {
      return payload.dj as DJOperator;
    }
    return payload as DJOperator;
  } catch (error) {
    console.error(`[DJ Service] Failed to fetch DJ Operator ${id}:`, error);
    return null;
  }
}

export async function adminCreateDJ(payload: Partial<DJOperator>): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.post<{ data: DJOperator }>('/admin/dj-operators', payload);
    return data.data;
  } catch (error) {
    console.error('[DJ Service] Failed to create DJ Operator:', error);
    throw error;
  }
}

export async function adminUpdateDJ(id: string, payload: Partial<DJOperator>): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.put<{ data: DJOperator }>(`/admin/dj-operators/${id}`, payload);
    return data.data;
  } catch (error) {
    console.error(`[DJ Service] Failed to update DJ Operator ${id}:`, error);
    throw error;
  }
}

export async function adminDeleteDJ(id: string): Promise<void> {
  try {
    await adminApiClient.delete(`/admin/dj-operators/${id}`);
  } catch (error) {
    console.error(`[DJ Service] Failed to delete DJ Operator ${id}:`, error);
    throw error;
  }
}
