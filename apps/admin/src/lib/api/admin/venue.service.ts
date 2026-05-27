import { Venue } from "@mad/types";

import { adminApiClient } from "@/lib/api/client";

export interface VenuesResponse {
  data: Venue[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NormalizedVenuesResponse {
  items: Venue[];
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

export async function adminGetVenues(
  filters: VenueFilters = {},
): Promise<NormalizedVenuesResponse> {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        params.set(k, String(v));
      }
    });
    const { data } = await adminApiClient.get<VenuesResponse>(
      `/admin/venues?${params}`,
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
      "[Venue Service] Failed to fetch venues, returning safe default NormalizedVenuesResponse:",
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

export async function adminGetVenue(id: string): Promise<Venue> {
  const { data } = await adminApiClient.get<{ data: { venue: Venue } }>(
    `/admin/venues/${id}`,
  );
  return data.data.venue;
}

export async function adminCreateVenue(
  payload: Partial<Venue>,
): Promise<Venue> {
  const { data } = await adminApiClient.post<{ data: { venue: Venue } }>(
    "/admin/venues",
    payload,
  );
  return data.data.venue;
}

export async function adminUpdateVenue(
  id: string,
  payload: Partial<Venue>,
): Promise<Venue> {
  const { data } = await adminApiClient.put<{ data: { venue: Venue } }>(
    `/admin/venues/${id}`,
    payload,
  );
  return data.data.venue;
}

export async function adminDeleteVenue(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/venues/${id}`);
}
