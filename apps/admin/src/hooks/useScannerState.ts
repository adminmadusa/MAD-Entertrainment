'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminScanTicket,
  adminGetScannerStats,
  adminGetScannerHistory,
  ScannerStats,
  ValidationResult,
  ScanResponse,
} from '../lib/api/admin/scanner.service';
import { extractApiError } from '../lib/api/client';

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

export interface UseScannerStateProps {
  initialEventId?: string;
}

export function useScannerState({ initialEventId = '' }: UseScannerStateProps = {}) {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [scannerState, setScannerState] = useState<ScannerModeState>('Idle');
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [optimisticCheckInCount, setOptimisticCheckInCount] = useState(0);
  const [syncResultSummary, setSyncResultSummary] = useState<string | null>(null);

  // Pagination and filter states for history
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilterStatus, setHistoryFilterStatus] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // 1. Detect network status changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Fetch offline queue counts
  const refreshOfflineCount = useCallback(async () => {
    try {
      const { getPendingScans } = await import('../lib/offline-scanner.service');
      const pending = await getPendingScans();
      setOfflineCount(pending.length);
    } catch (err) {
      console.error('Failed to query offline queue:', err);
    }
  }, []);

  useEffect(() => {
    refreshOfflineCount();
  }, [refreshOfflineCount, isOffline]);

  // 3. React Query: Stats query
  const { data: serverStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['scanner-stats', selectedEventId],
    queryFn: () => adminGetScannerStats(selectedEventId),
    enabled: !!selectedEventId && !isOffline,
    staleTime: 5000,
  });

  // 4. React Query: History query
  const { data: historyRes, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['scanner-history', selectedEventId, historyPage, historyFilterStatus, historySearch],
    queryFn: () =>
      adminGetScannerHistory(selectedEventId, {
        page: historyPage,
        limit: 15,
        status: historyFilterStatus || undefined,
        search: historySearch || undefined,
      }),
    enabled: !!selectedEventId && !isOffline,
  });

  // 5. Unified derived statistics strategy (aggregates local optimistic state when offline)
  const stats = useMemo<ScannerStats | null>(() => {
    if (!selectedEventId) return null;

    const baseStats: ScannerStats = serverStats || {
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
      const checkedInWithOffline = baseStats.checkedIn + optimisticCheckInCount;
      return {
        ...baseStats,
        checkedIn: checkedInWithOffline,
        remaining: Math.max(0, baseStats.totalTickets - checkedInWithOffline),
        offlinePending: offlineCount,
        successRate: baseStats.totalTickets > 0 ? Number(((checkedInWithOffline / baseStats.totalTickets) * 100).toFixed(2)) : 0,
      };
    }

    return {
      ...baseStats,
      offlinePending: offlineCount,
    };
  }, [selectedEventId, serverStats, isOffline, offlineCount, optimisticCheckInCount]);

  // 6. Online Scan Mutation
  const scanMutation = useMutation({
    mutationFn: ({ ticketId, requestId }: { ticketId: string; requestId: string }) =>
      adminScanTicket(ticketId, selectedEventId, requestId, 'camera'),
    onSuccess: (data: ScanResponse) => {
      setScannerState('Success');
      setLastValidationResult({
        status: 'SUCCESS',
        ticketId: data.ticketId,
        tierName: data.tierName,
        admits: data.admits,
        scannedAt: data.scannedAt,
        message: 'Ticket scanned and verified successfully.',
      });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['scanner-stats', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['scanner-history', selectedEventId] });
    },
    onError: (err: any) => {
      const apiErr = extractApiError(err);
      const isDuplicate = apiErr.message?.includes('already used') || apiErr.message?.includes('Already checked');

      if (isDuplicate) {
        const details = apiErr.details as any;
        setScannerState('Duplicate');
        setLastValidationResult({
          status: 'ALREADY_SCANNED',
          ticketId: details?.ticketId || '',
          scannedAt: details?.scannedAt,
          message: apiErr.message,
        });
      } else {
        setScannerState('Invalid');
        setLastValidationResult({
          status: 'INVALID',
          ticketId: '',
          message: apiErr.message || 'Ticket validation failed.',
        });
      }
    },
  });

  // 7. Submit Ticket Scan coordinator (Online & Offline abstraction)
  const submitScan = useCallback(
    async (ticketId: string) => {
      if (!selectedEventId || !ticketId.trim()) return;
      setScannerState('Processing');
      setLastValidationResult(null);

      const requestId = `scan-req-${crypto.randomUUID()}`;

      if (isOffline) {
        try {
          const { saveOfflineScan, isDuplicateScan } = await import('../lib/offline-scanner.service');

          // Prevent double-queueing
          const duplicate = await isDuplicateScan(ticketId, selectedEventId);
          if (duplicate) {
            setScannerState('Duplicate');
            setLastValidationResult({
              status: 'ALREADY_SCANNED',
              ticketId,
              message: 'This ticket is already queued for offline sync.',
            });
            return;
          }

          await saveOfflineScan(ticketId, selectedEventId);
          setOptimisticCheckInCount((prev) => prev + 1);
          await refreshOfflineCount();

          setScannerState('OfflineQueued');
          setLastValidationResult({
            status: 'OFFLINE_QUEUED',
            ticketId,
            tierName: 'OFFLINE MODE',
            admits: 1,
            message: 'Scan saved locally and queued for synchronization.',
          });
        } catch (err) {
          setScannerState('Error');
          setLastValidationResult({
            status: 'ERROR',
            ticketId,
            message: 'Failed to write offline scan to local database.',
          });
        }
      } else {
        scanMutation.mutate({ ticketId, requestId });
      }
    },
    [selectedEventId, isOffline, scanMutation, refreshOfflineCount]
  );

  // 8. Offline synchronization trigger
  const triggerOfflineSync = useCallback(async () => {
    if (isOffline || !selectedEventId) return;
    setScannerState('Syncing');
    setSyncResultSummary(null);

    try {
      const { syncScans, getPendingScans } = await import('../lib/offline-scanner.service');
      const pending = await getPendingScans();
      if (pending.length === 0) {
        setScannerState('Idle');
        return;
      }

      // Synchronize using adminScanTicket client API
      const result = await syncScans((tid, evId) => adminScanTicket(tid, evId, `sync-req-${crypto.randomUUID()}`, 'camera', true));

      setSyncResultSummary(
        `Sync completed: ${result.synced} success, ${result.failed.length} failed.`
      );
      setOptimisticCheckInCount(0);
      await refreshOfflineCount();

      queryClient.invalidateQueries({ queryKey: ['scanner-stats', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['scanner-history', selectedEventId] });

      if (result.failed.length > 0) {
        setScannerState('SyncFailed');
      } else {
        setScannerState('Idle');
      }
    } catch (err) {
      setScannerState('Error');
      setSyncResultSummary('Offline queue synchronization failed due to connection issue.');
    }
  }, [selectedEventId, isOffline, queryClient, refreshOfflineCount]);

  // 9. Auto-sync on reconnect
  useEffect(() => {
    if (!isOffline && selectedEventId) {
      triggerOfflineSync();
    }
  }, [isOffline, selectedEventId, triggerOfflineSync]);

  return {
    selectedEventId,
    setSelectedEventId,
    scannerState,
    setScannerState,
    lastValidationResult,
    setLastValidationResult,
    isOffline,
    offlineCount,
    syncResultSummary,
    setSyncResultSummary,
    stats,
    isLoadingStats,
    refetchStats,
    historyPage,
    setHistoryPage,
    historyFilterStatus,
    setHistoryFilterStatus,
    historySearch,
    setHistorySearch,
    historyItems: historyRes?.items || [],
    historyPagination: historyRes?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 },
    isLoadingHistory,
    refetchHistory,
    submitScan,
    triggerOfflineSync,
  };
}
