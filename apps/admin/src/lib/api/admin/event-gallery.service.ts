import { type EventGalleryItem, type EventGallerySettings, type MediaType } from '@mad/types';

import { adminApiClient } from '../client';

export interface GalleryItemPayload {
  mediaType?: MediaType;
  url: string;
  publicId: string;
  assetProvider?: string;
  thumbnail?: string;
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

export const adminUpdateGallerySettings = async (
  eventId: string,
  payload: { published?: boolean }
): Promise<EventGallerySettings> => {
  const { data } = await adminApiClient.patch<{ data: EventGallerySettings }>(
    `/admin/events/${eventId}/gallery/settings`,
    payload
  );
  return data.data;
};
