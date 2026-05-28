import { adminApiClient } from "@/lib/api/client";
import {
  EventListResponseSchema,
  EventResponseSchema,
  type EventMutationInput,
  type EventResponse,
} from "@mad/contracts";

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

export type AdminEvent = EventResponse & {
  shortDescription?: string;
  mode?: string;
  gallery?: CloudinaryImage[];
  ticketTiers: EventTier[];
};

export interface EventsResponse {
  data: AdminEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  featured?: boolean;
}

export async function adminGetEvents(
  filters: EventFilters = {},
): Promise<{ items: AdminEvent[]; pagination: EventsResponse["pagination"] }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === "") return; // skip undefined or empty strings
    params.set(k, String(v));
  });
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const { data } = await adminApiClient.get<any>(`/admin/events?${params}`);
  try {
    console.warn("RAW ADMIN EVENTS", data?.data);
    const parsed = EventListResponseSchema.parse(data?.data);
    console.warn("PARSED ADMIN EVENTS", parsed);
    return {
      items: parsed.events as AdminEvent[],
      pagination: {
        page,
        limit,
        total: parsed.total,
        totalPages: parsed.pages ?? Math.ceil(parsed.total / limit),
      },
    };
  } catch (error) {
    console.error("EVENT PARSE ERROR", error);
    return {
      items: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function adminGetEvent(id: string): Promise<AdminEvent> {
  const { data } = await adminApiClient.get<any>(`/admin/events/${id}`);
  return EventResponseSchema.parse(
    data?.data?.event || data?.data,
  ) as AdminEvent;
}

export async function adminCreateEvent(
  payload: EventMutationInput,
): Promise<AdminEvent> {
  const { data } = await adminApiClient.post<any>("/admin/events", payload);
  return EventResponseSchema.parse(
    data?.data?.event || data?.data,
  ) as AdminEvent;
}

export async function adminUpdateEvent(
  id: string,
  payload: Partial<EventMutationInput>,
): Promise<AdminEvent> {
  const { data } = await adminApiClient.put<any>(
    `/admin/events/${id}`,
    payload,
  );
  return EventResponseSchema.parse(
    data?.data?.event || data?.data,
  ) as AdminEvent;
}

export async function adminDeleteEvent(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/events/${id}`);
}

export async function adminToggleFeatured(
  id: string,
): Promise<{ isFeatured: boolean }> {
  const { data } = await adminApiClient.patch<{
    data: { isFeatured: boolean };
  }>(`/admin/events/${id}/featured`);
  return data.data;
}

export async function adminUpdateEventStatus(
  id: string,
  status: string,
): Promise<void> {
  await adminApiClient.patch(`/admin/events/${id}/status`, { status });
}
