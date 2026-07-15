import { adminApiClient } from '@/lib/api/client';

export interface AdminTier {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
  defaultVisibility?: boolean;
  sortIndex?: number;
  createdAt: string;
}

export async function adminGetTiers(): Promise<AdminTier[]> {
  const { data } = await adminApiClient.get<{ data: AdminTier[] }>('/admin/tiers');
  return Array.isArray(data?.data) ? data.data : (data?.data && Object.values(data.data).find(v => Array.isArray(v)) || []);
}

export async function adminCreateTier(payload: Partial<AdminTier>): Promise<AdminTier> {
  const { data } = await adminApiClient.post<{ data: { tier: AdminTier } }>('/admin/tiers', payload);
  return data.data.tier;
}

export async function adminUpdateTier(id: string, payload: Partial<AdminTier>): Promise<AdminTier> {
  const { data } = await adminApiClient.patch<{ data: { tier: AdminTier } }>(`/admin/tiers/${id}`, payload);
  return data.data.tier;
}

export async function adminDeleteTier(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/tiers/${id}`);
}
