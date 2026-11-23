export type ValidationStatus =
  | 'SUCCESS'
  | 'ALREADY_SCANNED'
  | 'INVALID'
  | 'EXPIRED'
  | 'WRONG_EVENT'
  | 'OFFLINE_QUEUED'
  | 'ERROR';

export type ScannerModeState =
  | 'Idle'
  | 'CameraInitializing'
  | 'Scanning'
  | 'Processing'
  | 'Success'
  | 'Duplicate'
  | 'Invalid'
  | 'OfflineQueued'
  | 'Syncing'
  | 'Error'
  | 'PermissionDenied'
  | 'NoCamera'
  | 'CameraUnavailable'
  | 'Paused'
  | 'Offline'
  | 'SyncFailed';

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
