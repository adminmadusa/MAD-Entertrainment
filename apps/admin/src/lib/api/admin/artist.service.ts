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

export interface NormalizedArtistsResponse {
  items: Artist[];
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

export async function adminGetArtists(filters: ArtistFilters = {}): Promise<NormalizedArtistsResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<ArtistsResponse>(`/admin/artists?${params}`);
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
    console.error('[Artist Service] Failed to fetch artists, returning safe default NormalizedArtistsResponse:', error);
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

export async function adminGetArtist(id: string): Promise<Artist | null> {
  try {
    const { data } = await adminApiClient.get<{ data: Record<string, unknown> | Artist }>(`/admin/artists/${id}`);
    const payload = data?.data;
    if (!payload) return null;
    if ('artist' in payload && payload.artist) {
      return payload.artist as Artist;
    }
    return payload as Artist;
  } catch (error) {
    console.error(`[Artist Service] Failed to fetch artist ${id}:`, error);
    return null;
  }
}

export async function adminCreateArtist(payload: Partial<Artist>): Promise<Artist | null> {
  try {
    const { data } = await adminApiClient.post<{ data: Artist }>('/admin/artists', payload);
    return data.data;
  } catch (error) {
    console.error('[Artist Service] Failed to create artist:', error);
    throw error;
  }
}

export async function adminUpdateArtist(id: string, payload: Partial<Artist>): Promise<Artist | null> {
  try {
    const { data } = await adminApiClient.put<{ data: Artist }>(`/admin/artists/${id}`, payload);
    return data.data;
  } catch (error) {
    console.error(`[Artist Service] Failed to update artist ${id}:`, error);
    throw error;
  }
}

export async function adminDeleteArtist(id: string): Promise<void> {
  try {
    await adminApiClient.delete(`/admin/artists/${id}`);
  } catch (error) {
    console.error(`[Artist Service] Failed to delete artist ${id}:`, error);
    throw error;
  }
}
