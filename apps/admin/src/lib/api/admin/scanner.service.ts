import { adminApiClient } from '../client';

export interface ScanResponse {
  ticketId: string;
  tierName: string;
  admits: number;
  scannedAt: string;
}

export async function adminScanTicket(ticketId: string, eventId: string): Promise<ScanResponse> {
  const { data } = await adminApiClient.post<{ status: string; message: string; data: ScanResponse }>('/admin/scanner/scan', {
    ticketId,
    eventId,
  });
  return data.data;
}
