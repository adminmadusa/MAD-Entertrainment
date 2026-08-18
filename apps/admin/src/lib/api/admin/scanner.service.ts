import { adminApiClient } from '../client';

export interface ScanResponse {
  ticketId: string;
  tierName: string;
  admits: number;
  scannedAt: string;
  guestName?: string;
  attendeeEmail?: string;
}

export type ValidationStatus = 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID' | 'EXPIRED' | 'WRONG_EVENT' | 'OFFLINE_QUEUED' | 'ERROR';

export interface ValidationResult {
  status: ValidationStatus;
  ticketId: string;
  tierName?: string;
  admits?: number;
  message?: string;
  scannedAt?: string;
  attendeeEmail?: string;
  guestName?: string;
}


export interface ScannerStats {
  totalTickets: number;
  checkedIn: number;
  remaining: number;
  failedScans: number;
  duplicateScans: number;
  offlinePending: number;
  offlineSynced: number;
  successRate: number;
  lastScanTime: string | null;
  averageScanTime: number;
}

export interface ScannerHistoryItem {
  id: string;
  ticketId: string;
  guestName: string;
  tierName: string;
  scannedAt: string;
  status: string;
  operatorId: string;
  scanSource: 'camera' | 'manual' | 'hardware';
  offline: boolean;
}

interface ScannerHistoryResponse {
  items: ScannerHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function adminScanTicket(
  ticketId: string,
  eventId: string,
  requestId?: string,
  source?: 'camera' | 'manual' | 'hardware',
  offline?: boolean
): Promise<ScanResponse> {
  const { data } = await adminApiClient.post<{ status: string; message: string; data: ScanResponse }>('/admin/scanner/scan', {
    ticketId,
    eventId,
    requestId,
    source,
    offline,
  });
  return data.data;
}


export async function adminGetScannerStats(eventId: string): Promise<ScannerStats> {
  const { data } = await adminApiClient.get<{ status: string; data: ScannerStats }>(`/admin/scanner/events/${eventId}/stats`);
  return data.data;
}

export async function adminGetScannerHistory(eventId: string, params: {
  page?: number;
  limit?: number;
  status?: string;
  operator?: string;
  search?: string;
} = {}): Promise<ScannerHistoryResponse> {
  const { data } = await adminApiClient.get<{ status: string; data: ScannerHistoryResponse }>(`/admin/scanner/events/${eventId}/history`, {
    params,
  });
  return data.data;
}
