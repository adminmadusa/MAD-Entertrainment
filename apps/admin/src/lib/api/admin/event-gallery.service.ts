import { type EventGalleryItem, type EventGallerySettings, type MediaType, type MediaVisibility } from '@mad/types';

import { adminApiClient } from '../client';

export interface GalleryItemPayload {
  mediaType?: MediaType;
  url: string;
  publicId: string;
  assetProvider?: string;
  thumbnail?: string;
  caption?: string;
}

export interface ReorderItemPayload {
  id: string;
  sortOrder: number;
}

export const adminGetGallery = async (
  eventId: string
): Promise<{ items: EventGalleryItem[]; settings: EventGallerySettings | null }> => {
  const { data } = await adminApiClient.get<{ data: { items: EventGalleryItem[]; settings: EventGallerySettings | null } }>(
    `/admin/events/${eventId}/gallery`
  );
  return data.data;
};

export const adminAddGalleryItems = async (
  eventId: string,
  items: GalleryItemPayload[]
): Promise<{ success: true; items: EventGalleryItem[] }> => {
  const { data } = await adminApiClient.post<{ data: { success: true; items: EventGalleryItem[] } }>(
    `/admin/events/${eventId}/gallery/items`,
    { items }
  );
  return data.data;
};

export const adminUpdateGalleryItem = async (
  eventId: string,
  itemId: string,
  payload: { caption?: string; visibility?: MediaVisibility }
): Promise<EventGalleryItem> => {
  const { data } = await adminApiClient.patch<{ data: EventGalleryItem }>(
    `/admin/events/${eventId}/gallery/items/${itemId}`,
    payload
  );
  return data.data;
};

export const adminSetGalleryCover = async (eventId: string, itemId: string): Promise<{ success: true }> => {
  const { data } = await adminApiClient.patch<{ data: { success: true } }>(
    `/admin/events/${eventId}/gallery/items/${itemId}/cover`
  );
  return data.data;
};

export const adminReorderGalleryItems = async (
  eventId: string,
  items: ReorderItemPayload[]
): Promise<{ success: true }> => {
  const { data } = await adminApiClient.patch<{ data: { success: true } }>(
    `/admin/events/${eventId}/gallery/items/order`,
    { items }
  );
  return data.data;
};

export const adminDeleteGalleryItem = async (eventId: string, itemId: string): Promise<{ success: true }> => {
  const { data } = await adminApiClient.delete<{ data: { success: true } }>(
    `/admin/events/${eventId}/gallery/items/${itemId}`
  );
  return data.data;
};

export const adminUpdateGallerySettings = async (
  eventId: string,
  payload: { published?: boolean; heading?: string; thankYouMessage?: string; highlights?: string[] }
): Promise<EventGallerySettings> => {
  const { data } = await adminApiClient.patch<{ data: EventGallerySettings }>(
    `/admin/events/${eventId}/gallery/settings`,
    payload
  );
  return data.data;
};
