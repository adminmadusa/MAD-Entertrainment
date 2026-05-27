import { DJOperator } from "@mad/types";

import { adminApiClient } from "@/lib/api/client";

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

export async function adminGetDJs(
  filters: DJFilters = {},
): Promise<NormalizedDJsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<DJsResponse>(
      `/admin/dj-operators?${params}`,
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
      "[DJ Service] Failed to fetch DJ Operators, returning safe default NormalizedDJsResponse:",
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

export async function adminGetDJ(id: string): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.get<any>(`/admin/dj-operators/${id}`);
    const payload = data?.data;
    // Prefer canonical keys first; keep legacy alias fallback for compatibility.
    return payload?.data || payload?.djOperator || payload?.dj || payload;
  } catch (error) {
    console.error(`[DJ Service] Failed to fetch DJ Operator ${id}:`, error);
    return null;
  }
}

export async function adminCreateDJ(
  payload: Partial<DJOperator>,
): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.post<{ data: DJOperator }>(
      "/admin/dj-operators",
      payload,
    );
    return data.data;
  } catch (error) {
    console.error("[DJ Service] Failed to create DJ Operator:", error);
    throw error;
  }
}

export async function adminUpdateDJ(
  id: string,
  payload: Partial<DJOperator>,
): Promise<DJOperator | null> {
  try {
    const { data } = await adminApiClient.put<{ data: DJOperator }>(
      `/admin/dj-operators/${id}`,
      payload,
    );
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
