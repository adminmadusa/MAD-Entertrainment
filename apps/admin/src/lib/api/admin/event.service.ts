import { adminApiClient } from '@/lib/api/client';

export interface EventTier {
  name: string;
  price: number;
  capacity: number;
  totalCapacity?: number;
  quantity?: number;
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
  isActive?: boolean;
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
  venue: string;
  startDate: string;
  endDate?: string;
  ticketTiers: EventTier[];
  totalCapacity: number;
  isFeatured: boolean;
  isAgeRestricted: boolean;
  minimumAge?: number;
  tags?: string[];
  createdAt: string;
  ticketProfileId?: string;
  ticketOverrides?: {
    tier: string;
    price?: number;
    totalCapacity?: number;
    isActive?: boolean;
  }[];
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
  const payload: any = data?.data || {};
  const items = Array.isArray(payload.events) ? payload.events : [];
  return { items, pagination: payload?.pagination || (data as any)?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 } };
}

export async function adminGetEvent(id: string): Promise<AdminEvent> {
  const { data } = await adminApiClient.get<any>(`/admin/events/${id}`);
  const payload = data?.data;
  return payload?.event || payload;
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
