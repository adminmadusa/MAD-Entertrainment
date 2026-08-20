'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminScanTicket } from '../lib/api/admin/scanner.service';

interface UseOfflineSyncProps {
  selectedEventId: string;
  isOffline: boolean;
  onSyncCompleted: () => void;
}

export function useOfflineSync({
  selectedEventId,
  isOffline,
  onSyncCompleted,
}: UseOfflineSyncProps) {
  const [offlineCount, setOfflineCount] = useState(0);
  const [optimisticCheckInCount, setOptimisticCheckInCount] = useState(0);
  const [syncResultSummary, setSyncResultSummary] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshOfflineCount = useCallback(async () => {
    try {
      const { getPendingScans } = await import('../lib/offline-scanner.service');
      const pending = await getPendingScans();
      setOfflineCount(pending.length);
    } catch {
      // IndexedDB unavailable or empty
    }
  }, []);

  useEffect(() => {
    refreshOfflineCount();
  }, [refreshOfflineCount, isOffline]);

  const triggerOfflineSync = useCallback(async () => {
    if (isOffline || !selectedEventId || isSyncing) return;
    setIsSyncing(true);
    setSyncResultSummary(null);

    try {
      const { syncScans, getPendingScans } = await import('../lib/offline-scanner.service');
      const pending = await getPendingScans();
      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      const result = await syncScans((tid, evId) =>
        adminScanTicket(tid, evId, `sync-req-${crypto.randomUUID()}`, 'camera', true)
      );

      setSyncResultSummary(`Sync completed: ${result.synced} success, ${result.failed.length} failed.`);
      setOptimisticCheckInCount(0);
      await refreshOfflineCount();
      onSyncCompleted();
    } catch {
      setSyncResultSummary('Offline queue synchronization failed due to connection issue.');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedEventId, isOffline, isSyncing, refreshOfflineCount, onSyncCompleted]);

  // Auto-sync when reconnecting online
  useEffect(() => {
    if (!isOffline && selectedEventId) {
      triggerOfflineSync();
    }
  }, [isOffline, selectedEventId, triggerOfflineSync]);

  return {
    offlineCount,
    optimisticCheckInCount,
    setOptimisticCheckInCount,
    syncResultSummary,
    setSyncResultSummary,
    refreshOfflineCount,
    triggerOfflineSync,
    isSyncing,
  };
}
