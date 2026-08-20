import { adminApiClient } from '@/lib/api/client';
import { createLogger } from '@/lib/logger';
import type { PaginatedItemsResponse } from '@mad/types';

const logger = createLogger('Refund Service');

export interface AdminRefund {
  _id: string;
  bookingId: { _id: string; bookingId: string } | string;
  paymentId: { _id: string; amount: number; gateway: string } | string;
  ticketIds?: string[];
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  adminNotes?: string;
  gatewayRefundId?: string;
  createdAt: string;
  processedAt?: string;
}

export type NormalizedRefundsResponse = PaginatedItemsResponse<AdminRefund>;

export async function adminGetRefunds(params: Record<string, string> = {}): Promise<NormalizedRefundsResponse> {
  try {
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
  } catch (error) {
    logger.error('Failed to fetch refunds, returning safe default NormalizedRefundsResponse:', error);
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
