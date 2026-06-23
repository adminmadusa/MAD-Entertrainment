import { PaginationMeta } from '@mad/types';
import { EventStatus } from '@mad/shared';
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
  category?: string;
  bookingMode?: string;
  status?: EventStatus;
  galleryImages?: CloudinaryImage[];
  venue: string;
  startDate: string;
  endDate?: string;
  ticketTiers: EventTier[];
  totalCapacity: number;
  eventVersion: number;
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
  posterImage?: CloudinaryImage;
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
    pagination: PaginationMeta;
    total?: number;
    pages?: number;
  };
  pagination?: PaginationMeta;
  message?: string;
}

interface EventResponse {
  success: boolean;
  data: AdminEvent | { event: AdminEvent };
  message?: string;
}

type PaginationSource = Partial<PaginationMeta> & { pages?: number };
type EventStatusFilter = EventStatus | `${EventStatus}` | '';

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: EventStatusFilter;
  search?: string;
}

export type AdminEventUpdatePayload = Partial<AdminEvent> & Pick<AdminEvent, 'eventVersion'>;

function isEventEnvelope(payload: EventResponse['data']): payload is { event: AdminEvent } {
  return typeof payload === 'object' && payload !== null && 'event' in payload;
}

function unwrapAdminEvent(response: EventResponse): AdminEvent {
  const payload = response.data;
  if (isEventEnvelope(payload)) {
    return payload.event;
  }
  return payload;
}

export async function adminGetEvents(filters: EventFilters = {}): Promise<{ items: AdminEvent[]; pagination: PaginationMeta }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
  const { data } = await adminApiClient.get<EventsResponse>(`/admin/events?${params}`);
  const payload = data?.data;
  const items = Array.isArray(payload?.events) ? payload.events : [];
  
  const paginationSource: PaginationSource = payload?.pagination ?? data?.pagination ?? payload;
  const pagination = {
    page: paginationSource?.page ?? Number(filters.page) ?? 1,
    limit: paginationSource?.limit ?? Number(filters.limit) ?? 15,
    total: paginationSource?.total ?? 0,
    totalPages: paginationSource?.totalPages ?? paginationSource?.pages ?? 1,
  };
  
  return { items, pagination };
}

export async function adminGetEvent(id: string): Promise<AdminEvent> {
  const { data } = await adminApiClient.get<EventResponse>(`/admin/events/${id}`);
  return unwrapAdminEvent(data);
}

export async function adminCreateEvent(payload: Partial<AdminEvent>): Promise<AdminEvent> {
  const { data } = await adminApiClient.post<EventResponse>('/admin/events', payload);
  return unwrapAdminEvent(data);
}

export async function adminUpdateEvent(id: string, payload: AdminEventUpdatePayload): Promise<AdminEvent> {
  const { data } = await adminApiClient.put<EventResponse>(`/admin/events/${id}`, payload);
  return unwrapAdminEvent(data);
}

export async function adminDeleteEvent(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/events/${id}`);
}
