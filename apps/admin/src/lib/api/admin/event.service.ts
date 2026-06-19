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
  category?: string;
  mode?: string;
  status?: string;
  coverImage?: CloudinaryImage;
  gallery?: CloudinaryImage[];
  venue: string;
  startDate: string;
  endDate?: string;
  ticketTiers: EventTier[];
  totalCapacity: number;
  isFeatured: boolean;
  requireTerms?: boolean;
  requireAgeConfirmation?: boolean;
  ageRestriction?: number;
  tags?: string[];
  createdAt: string;
  ticketProfileId?: string;
  ticketOverrides?: {
    tier: string;
    price?: number;
    totalCapacity?: number;
    isActive?: boolean;
  }[];
  organizerName?: string;
  refundPolicy?: string;
  highlights?: string[];
  bannerImage?: CloudinaryImage;
  ticketsSold?: number;
  ticketsCheckedIn?: number;
  ticketsRemaining?: number;
  attendancePercentage?: number;
  noShowCount?: number;
  noShowPercentage?: number;
}

export interface EventsResponse {
  success: boolean;
  data: {
    events: AdminEvent[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  message?: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  featured?: boolean;
}

export async function adminGetEvents(filters: EventFilters = {}): Promise<{ items: AdminEvent[]; pagination: EventsResponse['data']['pagination'] }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
  const { data } = await adminApiClient.get<any>(`/admin/events?${params}`);
  const payload = data?.data;
  const items = Array.isArray(payload?.events) ? payload.events : [];
  
  const paginationSource = payload?.pagination || data?.pagination || payload;
  const pagination = {
    page: paginationSource?.page ?? Number(filters.page) ?? 1,
    limit: paginationSource?.limit ?? Number(filters.limit) ?? 15,
    total: paginationSource?.total ?? 0,
    totalPages: paginationSource?.totalPages ?? paginationSource?.pages ?? 1,
  };
  
  return { items, pagination };
}

export async function adminGetEvent(id: string): Promise<AdminEvent> {
  const { data } = await adminApiClient.get<{ data: { event: AdminEvent } | AdminEvent }>(`/admin/events/${id}`);
  const payload = data?.data;
  if (!payload) throw new Error('Event not found');
  if ('event' in payload && payload.event) {
    return payload.event as AdminEvent;
  }
  return payload as AdminEvent;
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
