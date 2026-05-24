import { Venue } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface VenuesResponse {
  data: Venue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VenueFilters {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export async function adminGetVenues(filters: VenueFilters = {}): Promise<VenuesResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      params.set(k, String(v));
    }
  });
  const { data } = await adminApiClient.get<VenuesResponse>(`/admin/venues?${params}`);
  return data;
}

export async function adminGetVenue(id: string): Promise<Venue> {
  const { data } = await adminApiClient.get<{ data: Venue }>(`/admin/venues/${id}`);
  return data.data;
}

export async function adminCreateVenue(payload: Partial<Venue>): Promise<Venue> {
  const { data } = await adminApiClient.post<{ data: Venue }>('/admin/venues', payload);
  return data.data;
}

export async function adminUpdateVenue(id: string, payload: Partial<Venue>): Promise<Venue> {
  const { data } = await adminApiClient.put<{ data: Venue }>(`/admin/venues/${id}`, payload);
  return data.data;
}

export async function adminDeleteVenue(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/venues/${id}`);
}
