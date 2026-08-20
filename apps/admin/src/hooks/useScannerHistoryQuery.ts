'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGetScannerHistory } from '../lib/api/admin/scanner.service';

interface UseScannerHistoryQueryProps {
  selectedEventId: string;
  isOffline: boolean;
}

export function useScannerHistoryQuery({
  selectedEventId,
  isOffline,
}: UseScannerHistoryQueryProps) {
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

  const {
    data: historyRes,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: [
      'scanner-history',
      selectedEventId,
      historyPage,
      historyFilterStatus,
      debouncedHistorySearch,
    ],
    queryFn: () =>
      adminGetScannerHistory(selectedEventId, {
        page: historyPage,
        limit: 15,
        status: historyFilterStatus || undefined,
        search: debouncedHistorySearch || undefined,
      }),
    enabled: !!selectedEventId && !isOffline,
  });

  return {
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
  };
}
