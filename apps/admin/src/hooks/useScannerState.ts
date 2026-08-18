'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  adminScanTicket,
  adminGetScannerStats,
  adminGetScannerHistory,
  ScannerStats,
  ValidationResult,
  ScanResponse,
  ScannerModeState,
} from '../lib/api/admin/scanner.service';
import { extractApiError, normalizeTicketReference } from '@mad/utils';
import { playSuccess, playFailure } from '../lib/audio/gate-audio';
import { useOfflineSync } from './useOfflineSync';

export type { ScannerModeState };

export interface UseScannerStateProps {
  initialEventId?: string;
}

export function useScannerState({ initialEventId = '' }: UseScannerStateProps = {}) {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId);
  const [scannerState, setScannerState] = useState<ScannerModeState>('Idle');
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Pagination and filter states for history
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilterStatus, setHistoryFilterStatus] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('');

  // Debounce history search input (~300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHistorySearch(historySearch.trim());
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearch]);

  const handleSetFilterStatus = useCallback((status: string) => {
    setHistoryFilterStatus(status);
    setHistoryPage(1);
  }, []);

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

  const onSyncCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['scanner-stats', selectedEventId] });
    queryClient.invalidateQueries({ queryKey: ['scanner-history', selectedEventId] });
  }, [queryClient, selectedEventId]);

  // 2. Offline Sync Hook
  const {
    offlineCount,
    optimisticCheckInCount,
    setOptimisticCheckInCount,
    syncResultSummary,
    setSyncResultSummary,
    refreshOfflineCount,
    triggerOfflineSync,
  } = useOfflineSync({
    selectedEventId,
    isOffline,
    onSyncCompleted,
  });

  // 3. React Query: Stats query
  const { data: serverStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['scanner-stats', selectedEventId],
    queryFn: () => adminGetScannerStats(selectedEventId),
    enabled: !!selectedEventId && !isOffline,
    staleTime: 5000,
  });

  // 4. React Query: History query
  const { data: historyRes, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['scanner-history', selectedEventId, historyPage, historyFilterStatus, debouncedHistorySearch],
    queryFn: () =>
      adminGetScannerHistory(selectedEventId, {
        page: historyPage,
        limit: 15,
        status: historyFilterStatus || undefined,
        search: debouncedHistorySearch || undefined,
      }),
    enabled: !!selectedEventId && !isOffline,
  });

  // 5. Unified derived statistics strategy
  const stats = useMemo<ScannerStats | null>(() => {
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
        successRate: base.totalTickets > 0 ? Number(((checkedInWithOffline / base.totalTickets) * 100).toFixed(2)) : 0,
      };
    }

    return { ...base, offlinePending: offlineCount };
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
        guestName: data.guestName,
        attendeeEmail: data.attendeeEmail,
        message: 'Ticket scanned and verified successfully.',
      });
      playSuccess();
      queryClient.invalidateQueries({ queryKey: ['scanner-stats', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['scanner-history', selectedEventId] });
    },
    onError: (err: any, variables) => {
      const apiErr = extractApiError(err);
      const isDuplicate = apiErr.message?.includes('already used') || apiErr.message?.includes('Already checked');
      playFailure();

      const failedTicketId = (apiErr.details as any)?.ticketId || variables?.ticketId || '';

      if (isDuplicate) {
        const details = apiErr.details as any;
        setScannerState('Duplicate');
        setLastValidationResult({
          status: 'ALREADY_SCANNED',
          ticketId: failedTicketId,
          scannedAt: details?.scannedAt,
          message: apiErr.message,
        });
      } else {
        setScannerState('Invalid');
        setLastValidationResult({
          status: 'INVALID',
          ticketId: failedTicketId,
          message: apiErr.message || 'Ticket validation failed.',
        });
      }
    },
  });

  // 7. Submit Ticket Scan coordinator
  const submitScan = useCallback(
    async (rawTicketId: string) => {
      const ticketId = normalizeTicketReference(rawTicketId);
      if (!selectedEventId || !ticketId) return;
      if (scannerState === 'Processing') return;

      setScannerState('Processing');
      setLastValidationResult(null);

      const requestId = `scan-req-${crypto.randomUUID()}`;

      if (isOffline) {
        try {
          const { saveOfflineScan, isDuplicateScan } = await import('../lib/offline-scanner.service');

          const duplicate = await isDuplicateScan(ticketId, selectedEventId);
          if (duplicate) {
            setScannerState('Duplicate');
            setLastValidationResult({
              status: 'ALREADY_SCANNED',
              ticketId,
              message: 'This ticket is already queued for offline sync.',
            });
            playFailure();
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
          playSuccess();
        } catch {
          setScannerState('Error');
          setLastValidationResult({
            status: 'ERROR',
            ticketId,
            message: 'Failed to write offline scan to local database.',
          });
          playFailure();
        }
      } else {
        scanMutation.mutate({ ticketId, requestId });
      }
    },
    [selectedEventId, isOffline, scanMutation, refreshOfflineCount, setOptimisticCheckInCount, scannerState]
  );

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
    setHistoryFilterStatus: handleSetFilterStatus,
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
