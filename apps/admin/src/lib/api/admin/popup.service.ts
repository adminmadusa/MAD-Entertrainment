import { PopupCampaign } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export interface PopupsResponse {
  data: PopupCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NormalizedPopupsResponse {
  items: PopupCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminGetPopups(page = 1, limit = 15): Promise<NormalizedPopupsResponse> {
  try {
    const { data } = await adminApiClient.get<PopupsResponse>(`/admin/popups?page=${page}&limit=${limit}`);
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
    console.error('[Popup Service] Failed to fetch popup campaigns, returning safe default NormalizedPopupsResponse:', error);
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

export async function adminGetPopup(id: string): Promise<PopupCampaign | null> {
  try {
    const { data } = await adminApiClient.get<{ data: Record<string, unknown> | PopupCampaign }>(`/admin/popups/${id}`);
    const payload = data?.data;
    if (!payload) return null;
    if ('popup' in payload && payload.popup) {
      return payload.popup as PopupCampaign;
    }
    if ('popupCampaign' in payload && payload.popupCampaign) {
      return payload.popupCampaign as PopupCampaign;
    }
    return payload as PopupCampaign;
  } catch (error) {
    console.error(`[Popup Service] Failed to fetch popup campaign ${id}:`, error);
    return null;
  }
}

export async function adminCreatePopup(payload: Partial<PopupCampaign>): Promise<PopupCampaign | null> {
  try {
    const { data } = await adminApiClient.post<{ data: PopupCampaign }>('/admin/popups', payload);
    return data.data;
  } catch (error) {
    console.error('[Popup Service] Failed to create popup campaign:', error);
    throw error;
  }
}

export async function adminUpdatePopup(id: string, payload: Partial<PopupCampaign>): Promise<PopupCampaign | null> {
  try {
    const { data } = await adminApiClient.put<{ data: PopupCampaign }>(`/admin/popups/${id}`, payload);
    return data.data;
  } catch (error) {
    console.error(`[Popup Service] Failed to update popup campaign ${id}:`, error);
    throw error;
  }
}

export async function adminDeletePopup(id: string): Promise<void> {
  try {
    await adminApiClient.delete(`/admin/popups/${id}`);
  } catch (error) {
    console.error(`[Popup Service] Failed to delete popup campaign ${id}:`, error);
    throw error;
  }
}

export async function adminTogglePopup(id: string): Promise<{ isActive: boolean } | null> {
  try {
    const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/popups/${id}/toggle`);
    return data.data;
  } catch (error) {
    console.error(`[Popup Service] Failed to toggle active status for popup campaign ${id}:`, error);
    throw error;
  }
}
