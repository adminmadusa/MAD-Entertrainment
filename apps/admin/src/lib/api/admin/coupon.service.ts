import { adminApiClient } from '@/lib/api/client';
import type { Coupon, PaginatedDataResponse, PaginatedItemsResponse } from '@mad/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Coupon Service');

export type CouponsResponse = PaginatedDataResponse<Coupon>;

export type NormalizedCouponsResponse = PaginatedItemsResponse<Coupon>;


export async function adminGetCoupons(page = 1, limit = 15, active?: string): Promise<NormalizedCouponsResponse> {
  try {
    let url = `/admin/coupons?page=${page}&limit=${limit}`;
    if (active) {
      url += `&active=${active}`;
    }
    const { data } = await adminApiClient.get<CouponsResponse>(url);
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
    logger.error('Failed to fetch coupons, returning safe default NormalizedCouponsResponse:', error);
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
    const { data } = await adminApiClient.get<{ data: Record<string, unknown> | Coupon }>(`/admin/coupons/${id}`);
    const payload = data?.data;
    if (!payload) return null;
    if ('coupon' in payload && payload.coupon) {
      return payload.coupon as Coupon;
    }
    return payload as Coupon;
  } catch (error) {
    logger.error(`Failed to fetch coupon ${id}:`, error);
    return null;
  }
}

export async function adminCreateCoupon(payload: Partial<Coupon>): Promise<Coupon | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Coupon }>('/admin/coupons', payload);
    return data.data;
  } catch (error) {
    logger.error('Failed to create coupon:', error);
    return null;
  }
}

export async function adminUpdateCoupon(id: string, payload: Partial<Coupon>): Promise<Coupon | null> {
  try {
    const { data } = await adminApiClient.put<{ data: Coupon }>(`/admin/coupons/${id}`, payload);
    return data.data;
  } catch (error) {
    logger.error(`Failed to update coupon ${id}:`, error);
    return null;
  }
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  try {
    await adminApiClient.delete(`/admin/coupons/${id}`);
  } catch (error) {
    logger.error(`Failed to delete coupon ${id}:`, error);
  }
}

export async function adminToggleCoupon(id: string): Promise<{ isActive: boolean } | null> {
  try {
    const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/coupons/${id}/toggle`);
    return data.data;
  } catch (error) {
    logger.error(`Failed to toggle coupon ${id}:`, error);
    return null;
  }
}
