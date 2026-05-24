import { Coupon } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface CouponsResponse {
  data: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetCoupons(page = 1, limit = 15, active?: string): Promise<CouponsResponse> {
  let url = `/admin/coupons?page=${page}&limit=${limit}`;
  if (active) {
    url += `&active=${active}`;
  }
  const { data } = await adminApiClient.get<CouponsResponse>(url);
  return data;
}

export async function adminGetCoupon(id: string): Promise<Coupon> {
  const { data } = await adminApiClient.get<{ data: Coupon }>(`/admin/coupons/${id}`);
  return data.data;
}

export async function adminCreateCoupon(payload: Partial<Coupon>): Promise<Coupon> {
  const { data } = await adminApiClient.post<{ data: Coupon }>('/admin/coupons', payload);
  return data.data;
}

export async function adminUpdateCoupon(id: string, payload: Partial<Coupon>): Promise<Coupon> {
  const { data } = await adminApiClient.put<{ data: Coupon }>(`/admin/coupons/${id}`, payload);
  return data.data;
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/coupons/${id}`);
}

export async function adminToggleCoupon(id: string): Promise<{ isActive: boolean }> {
  const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/coupons/${id}/toggle`);
  return data.data;
}
