import { Artist } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface ArtistsResponse {
  data: Artist[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ArtistFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export async function adminGetArtists(filters: ArtistFilters = {}): Promise<ArtistsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      params.set(k, String(v));
    }
  });
  const { data } = await adminApiClient.get<ArtistsResponse>(`/admin/artists?${params}`);
  return data;
}

export async function adminGetArtist(id: string): Promise<Artist> {
  const { data } = await adminApiClient.get<{ data: Artist }>(`/admin/artists/${id}`);
  return data.data;
}

export async function adminCreateArtist(payload: Partial<Artist>): Promise<Artist> {
  const { data } = await adminApiClient.post<{ data: Artist }>('/admin/artists', payload);
  return data.data;
}

export async function adminUpdateArtist(id: string, payload: Partial<Artist>): Promise<Artist> {
  const { data } = await adminApiClient.put<{ data: Artist }>(`/admin/artists/${id}`, payload);
  return data.data;
}

export async function adminDeleteArtist(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/artists/${id}`);
}
