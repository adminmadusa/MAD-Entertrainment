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

export async function adminGetPopups(page = 1, limit = 15): Promise<PopupsResponse> {
  const { data } = await adminApiClient.get<PopupsResponse>(`/admin/popups?page=${page}&limit=${limit}`);
  return data;
}

export async function adminGetPopup(id: string): Promise<PopupCampaign> {
  const { data } = await adminApiClient.get<{ data: PopupCampaign }>(`/admin/popups/${id}`);
  return data.data;
}

export async function adminCreatePopup(payload: Partial<PopupCampaign>): Promise<PopupCampaign> {
  const { data } = await adminApiClient.post<{ data: PopupCampaign }>('/admin/popups', payload);
  return data.data;
}

export async function adminUpdatePopup(id: string, payload: Partial<PopupCampaign>): Promise<PopupCampaign> {
  const { data } = await adminApiClient.put<{ data: PopupCampaign }>(`/admin/popups/${id}`, payload);
  return data.data;
}

export async function adminDeletePopup(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/popups/${id}`);
}

export async function adminTogglePopup(id: string): Promise<{ isActive: boolean }> {
  const { data } = await adminApiClient.patch<{ data: { isActive: boolean } }>(`/admin/popups/${id}/toggle`);
  return data.data;
}
