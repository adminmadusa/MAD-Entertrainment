'use client';

import { useQuery } from '@tanstack/react-query';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { formatEventDate } from '@mad/utils';

import { useScannerState } from '@/hooks/useScannerState';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ScannerStats } from '@/components/scanner/ScannerStats';
import { ScanHistory } from '@/components/scanner/ScanHistory';
import { TicketValidationModal } from '@/components/scanner/TicketValidationModal';

export default function ScannerPage() {
  const {
    selectedEventId,
    setSelectedEventId,
    scannerState,
    lastValidationResult,
    setLastValidationResult,
    isOffline,
    offlineCount,
    syncResultSummary,
    setSyncResultSummary,
    stats,
    isLoadingStats,
    historyPage,
    setHistoryPage,
    historyFilterStatus,
    setHistoryFilterStatus,
    historySearch,
    setHistorySearch,
    historyItems,
    historyPagination,
    isLoadingHistory,
    submitScan,
    triggerOfflineSync,
  } = useScannerState();

  // Fetch active events for selection
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const events = eventsRes?.items || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gate Ticket Scanner</h1>
          <p className="text-text-muted mt-1 text-sm">
            Select an event, activate camera access, and scan barcodes to validate entry.
          </p>
        </div>

        {/* Offline Status indicator */}
        <div className="flex gap-2 items-center">
          {isOffline ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Offline Mode ({offlineCount} queued)
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Live Connected
            </div>
          )}
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResultSummary && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span>{syncResultSummary}</span>
          </div>
          <button
            onClick={() => setSyncResultSummary(null)}
            className="text-text-muted hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Event Selection Container */}
      <div className="glass rounded-2xl border border-border-subtle p-6 bg-background-card/50">
        <label htmlFor="event-select" className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
          Target Event Selection
        </label>
        <select
          id="event-select"
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value);
            setLastValidationResult(null);
          }}
          className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-white text-sm focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all outline-none"
          disabled={isLoadingEvents}
        >
          <option value="">-- Choose target event to validate --</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>
              {ev.title} ({formatEventDate(ev.startDate)})
            </option>
          ))}
        </select>
      </div>

      {selectedEventId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Scanner Stream / Camera Feed Box */}
          <div className="lg:col-span-5 space-y-6">
            <ScannerCamera
              isOffline={isOffline}
              onScan={submitScan}
              scannerState={scannerState}
            />
          </div>

          {/* Stats & History logs Box */}
          <div className="lg:col-span-7 space-y-6">
            <ScannerStats
              stats={stats}
              isLoading={isLoadingStats}
            />

            {!isOffline && (
              <ScanHistory
                items={historyItems}
                isLoading={isLoadingHistory}
                page={historyPage}
                setPage={setHistoryPage}
                totalPages={historyPagination.totalPages}
                filterStatus={historyFilterStatus}
                setFilterStatus={setHistoryFilterStatus}
                search={historySearch}
                setSearch={setHistorySearch}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border-subtle p-12 text-center text-text-secondary bg-background-card/30">
          Please select an event above to initialize and open the scanner console.
        </div>
      )}

      {/* Validation Result Modal Dialog Overlay */}
      <TicketValidationModal
        result={lastValidationResult}
        onClose={() => setLastValidationResult(null)}
      />
    </div>
  );
}
