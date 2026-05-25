import { adminApiClient } from '@/lib/api/client';

export interface EventTier {
  name: string;
  price: number;
  capacity: number;
  groupSize?: number;
  minPerBooking?: number;
  discount?: number;
  taxPercent?: number;
  availabilityWindow?: {
    startDate: string;
    endDate: string;
  };
  description?: string;
  perks?: string[];
  isAvailable: boolean;
}

export interface CloudinaryImage {
  url: string;
  publicId: string;
  alt?: string;
}

export interface AdminEvent {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: string;
  mode: string;
  status: string;
  coverImage?: CloudinaryImage;
  gallery?: CloudinaryImage[];
  venueId?: { _id: string; name: string; city: string } | null;
  startDate: string;
  endDate?: string;
  ticketTiers: EventTier[];
  totalCapacity: number;
  isFeatured: boolean;
  isAgeRestricted: boolean;
  minimumAge?: number;
  tags?: string[];
  createdAt: string;
}

export interface EventsResponse {
  data: AdminEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  featured?: boolean;
}

export async function adminGetEvents(filters: EventFilters = {}): Promise<{ items: AdminEvent[]; pagination: EventsResponse['pagination'] }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
  const { data } = await adminApiClient.get<EventsResponse>(`/admin/events?${params}`);
  const items = Array.isArray(data?.data) ? data?.data : [];
  return { items, pagination: data?.pagination };
}

export async function adminGetEvent(id: string): Promise<AdminEvent> {
  const { data } = await adminApiClient.get<{ data: AdminEvent }>(`/admin/events/${id}`);
  return data.data;
}

export async function adminCreateEvent(payload: Partial<AdminEvent>): Promise<AdminEvent> {
  const { data } = await adminApiClient.post<{ data: AdminEvent }>('/admin/events', payload);
  return data.data;
}

export async function adminUpdateEvent(id: string, payload: Partial<AdminEvent>): Promise<AdminEvent> {
  const { data } = await adminApiClient.put<{ data: AdminEvent }>(`/admin/events/${id}`, payload);
  return data.data;
}

export async function adminDeleteEvent(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/events/${id}`);
}

export async function adminToggleFeatured(id: string): Promise<{ isFeatured: boolean }> {
  const { data } = await adminApiClient.patch<{ data: { isFeatured: boolean } }>(`/admin/events/${id}/featured`);
  return data.data;
}

export async function adminUpdateEventStatus(id: string, status: string): Promise<void> {
  await adminApiClient.patch(`/admin/events/${id}/status`, { status });
}
