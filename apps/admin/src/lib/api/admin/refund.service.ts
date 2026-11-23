import type { AdminRefund, NormalizedRefundsResponse } from '@mad/types';

import { adminApiClient } from '@/lib/api/client';

export type { AdminRefund, NormalizedRefundsResponse };

export async function adminGetRefunds(params: Record<string, string> = {}): Promise<NormalizedRefundsResponse> {
  const qs = new URLSearchParams(params);
  const { data } = await adminApiClient.get<{
    data: {
      refunds: AdminRefund[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>(`/admin/refunds?${qs}`);

  return {
    items: data?.data?.refunds ?? [],
    pagination: {
      page: data?.data?.pagination?.page ?? 1,
      limit: data?.data?.pagination?.limit ?? 15,
      total: data?.data?.pagination?.total ?? 0,
      totalPages: data?.data?.pagination?.totalPages ?? 1,
    },
  };
}

export async function adminProcessRefund(
  id: string,
  action: 'approve' | 'reject',
  adminNotes?: string,
  gatewayRefundId?: string,
  manualOverride?: boolean,
  overrideReason?: string
): Promise<void> {
  await adminApiClient.patch(`/admin/refunds/${id}/process`, {
    action,
    adminNotes,
    gatewayRefundId,
    manualOverride,
    overrideReason,
  });
}
