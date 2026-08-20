import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOfflineSync } from './useOfflineSync';

vi.mock('../lib/api/admin/scanner.service', () => ({
  adminScanTicket: vi.fn(),
}));

vi.mock('../lib/offline-scanner.service', () => ({
  getPendingScans: vi.fn().mockResolvedValue([]),
  syncScans: vi.fn().mockResolvedValue({ synced: 0, failed: [] }),
}));

describe('useOfflineSync Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default counts and idle state when no event selected', async () => {
    const onSyncCompleted = vi.fn();
    const { result } = renderHook(() =>
      useOfflineSync({
        selectedEventId: '',
        isOffline: false,
        onSyncCompleted,
      })
    );

    expect(result.current.offlineCount).toBe(0);
    expect(result.current.optimisticCheckInCount).toBe(0);
    expect(result.current.syncResultSummary).toBeNull();
    expect(result.current.isSyncing).toBe(false);
  });

  it('updates optimistic check-in count cleanly', async () => {
    const onSyncCompleted = vi.fn();
    const { result } = renderHook(() =>
      useOfflineSync({
        selectedEventId: 'event-123',
        isOffline: true,
        onSyncCompleted,
      })
    );

    act(() => {
      result.current.setOptimisticCheckInCount(3);
    });

    expect(result.current.optimisticCheckInCount).toBe(3);
  });
});
