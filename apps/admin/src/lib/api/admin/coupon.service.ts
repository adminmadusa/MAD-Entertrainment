import { Coupon } from "@mad/types";

import { adminApiClient } from "@/lib/api/client";

export interface CouponsResponse {
  data: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NormalizedCouponsResponse {
  items: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetCoupons(
  page = 1,
  limit = 15,
  active?: string,
): Promise<NormalizedCouponsResponse> {
  try {
    let url = `/admin/coupons?page=${page}&limit=${limit}`;
    if (active) {
      url += `&active=${active}`;
    }
    const { data } = await adminApiClient.get<CouponsResponse>(url);
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
      "[Coupon Service] Failed to fetch coupons, returning safe default NormalizedCouponsResponse:",
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

export async function adminGetCoupon(id: string): Promise<Coupon | null> {
  try {
    const { data } = await adminApiClient.get<any>(`/admin/coupons/${id}`);
    const payload = data?.data;
    return payload?.coupon || payload;
  } catch (error) {
    console.error(`[Coupon Service] Failed to fetch coupon ${id}:`, error);
    return null;
  }
}

export async function adminCreateCoupon(
  payload: Partial<Coupon>,
): Promise<Coupon | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Coupon }>(
      "/admin/coupons",
      payload,
    );
    return data.data;
  } catch (error) {
    console.error("[Coupon Service] Failed to create coupon:", error);
    return null;
  }
}

export async function adminUpdateCoupon(
  id: string,
  payload: Partial<Coupon>,
): Promise<Coupon | null> {
  try {
    const { data } = await adminApiClient.put<{ data: Coupon }>(
      `/admin/coupons/${id}`,
      payload,
    );
    return data.data;
  } catch (error) {
    console.error(`[Coupon Service] Failed to update coupon ${id}:`, error);
    return null;
  }
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  try {
    await adminApiClient.delete(`/admin/coupons/${id}`);
  } catch (error) {
    console.error(`[Coupon Service] Failed to delete coupon ${id}:`, error);
  }
}

export async function adminToggleCoupon(
  id: string,
): Promise<{ isActive: boolean } | null> {
  try {
    const { data } = await adminApiClient.patch<{
      data: { isActive: boolean };
    }>(`/admin/coupons/${id}/toggle`);
    return data.data;
  } catch (error) {
    console.error(`[Coupon Service] Failed to toggle coupon ${id}:`, error);
    return null;
  }
}
