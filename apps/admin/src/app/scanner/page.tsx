'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { RecentActivityStrip } from '@/components/scanner/RecentActivityStrip';
import { ScanHistory } from '@/components/scanner/ScanHistory';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ScannerStats } from '@/components/scanner/ScannerStats';
import { ScannerVerifyForm } from '@/components/scanner/ScannerVerifyForm';
import { TicketValidationModal } from '@/components/scanner/TicketValidationModal';
import { useScannerState } from '@/hooks/useScannerState';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { EventStatus } from '@mad/shared';
import { formatEventDate } from '@mad/utils';

type ActiveTab = 'scan' | 'verify' | 'stats' | 'history';

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
  } = useScannerState();

  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');

  // Camera is paused whenever a result is visible, a scan is in-flight, or not on scan tab
  const isPaused = lastValidationResult !== null || scannerState === 'Processing' || activeTab !== 'scan';

  // Fetch published events for selection and exclude expired/past events
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: EventStatus.PUBLISHED }],
    queryFn: () => adminGetEvents({ limit: 100, status: EventStatus.PUBLISHED }),
  });

  const now = Date.now();
  const events = (eventsRes?.items || []).filter((ev) => {
    if (ev.status === EventStatus.COMPLETED || ev.status === EventStatus.ARCHIVED || ev.status === EventStatus.CANCELLED) {
      return false;
    }
    if (ev.endDate) {
      return new Date(ev.endDate).getTime() >= now;
    }
    if (ev.startDate) {
      // Allow scan window up to 24 hours after start time if no endDate
      return new Date(ev.startDate).getTime() + 24 * 60 * 60 * 1000 >= now;
    }
    return true;
  });

  const handleNextScan = () => {
    setLastValidationResult(null);
    if (activeTab === 'verify') {
      setActiveTab('scan');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 pb-12">
      {/* ── Unified Top Control Bar ── */}
      <div className="glass rounded-2xl border border-border-subtle p-6 bg-background-card/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Gate Ticket Scanner</h1>
            <p className="text-text-muted mt-1 text-xs sm:text-sm">
              Event check-in console with real-time barcode validation and gate analytics.
            </p>
          </div>

          {/* Network status indicator */}
          <div className="flex gap-2 items-center shrink-0">
            {isOffline ? (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" aria-hidden="true" />
                Offline ({offlineCount} queued)
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
                Live Connected
              </div>
            )}
          </div>
        </div>

        {/* Target Event Selection */}
        <div className="space-y-1.5 pt-1">
          <label htmlFor="event-select" className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
            Target Event
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setLastValidationResult(null);
            }}
            className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 min-h-[48px] text-white text-sm focus-ring transition-all"
            disabled={isLoadingEvents}
          >
            <option value="">-- Choose target event to validate tickets --</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title} ({formatEventDate(ev.startDate)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResultSummary && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{syncResultSummary}</span>
          </div>
          <button
            onClick={() => setSyncResultSummary(null)}
            className="text-text-muted hover:text-white transition-colors focus-ring rounded"
            aria-label="Dismiss sync result"
          >
            Dismiss
          </button>
        </div>
      )}

      {selectedEventId ? (
        <div className="space-y-6">
          {/* ── 4-Tab Navigation Bar ── */}
          <div
            role="tablist"
            aria-label="Scanner sections"
            className="glass rounded-2xl border border-border-subtle bg-background-card/50 p-1.5 flex gap-1 overflow-x-auto"
          >
            {/* 1. Live Scan Tab */}
            <button
              role="tab"
              id="tab-scan"
              aria-selected={activeTab === 'scan'}
              aria-controls="tabpanel-scan"
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 focus-ring shrink-0 ${
                activeTab === 'scan'
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Live Scan</span>
            </button>

            {/* 2. Manual Verify Tab */}
            <button
              role="tab"
              id="tab-verify"
              aria-selected={activeTab === 'verify'}
              aria-controls="tabpanel-verify"
              type="button"
              onClick={() => setActiveTab('verify')}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 focus-ring shrink-0 ${
                activeTab === 'verify'
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
              </svg>
              <span>Manual Verify</span>
            </button>

            {/* 3. Gate Stats Tab */}
            <button
              role="tab"
              id="tab-stats"
              aria-selected={activeTab === 'stats'}
              aria-controls="tabpanel-stats"
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 focus-ring shrink-0 ${
                activeTab === 'stats'
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Gate Stats</span>
              {stats && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md tabular-nums font-mono">
                  {stats.checkedIn}/{stats.totalTickets}
                </span>
              )}
            </button>

            {/* 4. Scan History Tab */}
            <button
              role="tab"
              id="tab-history"
              aria-selected={activeTab === 'history'}
              aria-controls="tabpanel-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 focus-ring shrink-0 ${
                activeTab === 'history'
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Scan Logs</span>
            </button>
          </div>

          {/* ── Tab Content Panels ── */}
          <div>
            {/* 1. Scan Panel */}
            <div
              role="tabpanel"
              id="tabpanel-scan"
              aria-labelledby="tab-scan"
              className={activeTab === 'scan' ? 'space-y-6' : 'hidden'}
            >
              <div className="max-w-2xl mx-auto space-y-5">
                <ScannerCamera
                  isOffline={isOffline}
                  onScan={submitScan}
                  scannerState={scannerState}
                  isPaused={isPaused}
                />
                {!isOffline && <RecentActivityStrip items={historyItems} />}
              </div>
            </div>

            {/* 2. Verify Panel */}
            {activeTab === 'verify' && (
              <ScannerVerifyForm
                scannerState={scannerState}
                onSubmit={submitScan}
                onBackToScan={() => setActiveTab('scan')}
              />
            )}

            {/* 3. Gate Stats Panel */}
            {activeTab === 'stats' && (
              <div
                role="tabpanel"
                id="tabpanel-stats"
                aria-labelledby="tab-stats"
                className="space-y-6"
              >
                <ScannerStats stats={stats} isLoading={isLoadingStats} />
              </div>
            )}

            {/* 4. Scan History Panel */}
            {activeTab === 'history' && (
              <div
                role="tabpanel"
                id="tabpanel-history"
                aria-labelledby="tab-history"
              >
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
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border-subtle p-12 text-center text-text-secondary bg-background-card/30 space-y-2">
          <p className="text-base font-bold text-white">No Event Selected</p>
          <p className="text-xs text-text-muted">
            Please choose a target event from the dropdown above to initialize the gate scanner.
          </p>
        </div>
      )}

      {/* SR live region for scan results */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {lastValidationResult
          ? `Scan result: ${lastValidationResult.status.replace('_', ' ')}. ${lastValidationResult.message ?? ''}`
          : ''}
      </div>

      {/* Validation Result Modal */}
      <AnimatePresence>
        {lastValidationResult && (
          <TicketValidationModal
            key="validation-modal"
            result={lastValidationResult}
            onClose={handleNextScan}
            onSwitchToVerify={() => setActiveTab('verify')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
