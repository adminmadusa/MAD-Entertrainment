import type { ScannerStats } from '../lib/api/admin/scanner.service';

export function computeScannerStats(
  selectedEventId: string,
  serverStats: ScannerStats | undefined,
  isOffline: boolean,
  offlineCount: number,
  optimisticCheckInCount: number
): ScannerStats | null {
  if (!selectedEventId) return null;

  const base: ScannerStats = serverStats || {
    totalTickets: 0,
    checkedIn: 0,
    remaining: 0,
    failedScans: 0,
    duplicateScans: 0,
    offlinePending: 0,
    offlineSynced: 0,
    successRate: 0,
    lastScanTime: null,
    averageScanTime: 0,
  };

  if (isOffline) {
    const checkedInWithOffline = base.checkedIn + optimisticCheckInCount;
    return {
      ...base,
      checkedIn: checkedInWithOffline,
      remaining: Math.max(0, base.totalTickets - checkedInWithOffline),
      offlinePending: offlineCount,
      successRate:
        base.totalTickets > 0
          ? Number(((checkedInWithOffline / base.totalTickets) * 100).toFixed(2))
          : 0,
    };
  }

  return { ...base, offlinePending: offlineCount };
}
