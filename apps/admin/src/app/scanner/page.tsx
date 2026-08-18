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

type ActiveTab = 'scan' | 'verify';

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
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  // Camera is paused whenever a result is visible or a scan is in-flight
  const isPaused = lastValidationResult !== null || scannerState === 'Processing';

  // Fetch active events for selection
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: EventStatus.PUBLISHED }],
    queryFn: () => adminGetEvents({ limit: 100, status: EventStatus.PUBLISHED }),
  });

  const events = eventsRes?.items || [];

  const handleSwitchToVerify = () => {
    setActiveTab('verify');
  };

  const handleNextScan = () => {
    setLastValidationResult(null);
    if (activeTab === 'verify') {
      setActiveTab('scan');
    }
  };

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

        {/* Network status indicator */}
        <div className="flex gap-2 items-center">
          {isOffline ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" aria-hidden="true" />
              Offline Mode ({offlineCount} queued)
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
              Live Connected
            </div>
          )}
        </div>
      </div>

      {/* Sync result banner */}
      {syncResultSummary && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl text-xs font-bold animate-fadeIn">
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

      {/* Event selection */}
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
          className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 min-h-[44px] text-white text-sm focus-ring transition-all"
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
          {/* ── Left column: Tabs + Camera / Verify + Recent Activity (Primary on mobile) ── */}
          <div className="order-1 lg:order-1 lg:col-span-5 space-y-4">
            {/* Tab switcher */}
            <div
              role="tablist"
              aria-label="Scanner mode"
              className="glass rounded-2xl border border-border-subtle bg-background-card/50 p-1.5 flex gap-1"
            >
              <button
                role="tab"
                id="tab-scan"
                aria-selected={activeTab === 'scan'}
                aria-controls="tabpanel-scan"
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px] focus-ring ${
                  activeTab === 'scan'
                    ? 'bg-accent-purple text-white shadow-glow-sm'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                Scan
              </button>
              <button
                role="tab"
                id="tab-verify"
                aria-selected={activeTab === 'verify'}
                aria-controls="tabpanel-verify"
                type="button"
                onClick={() => setActiveTab('verify')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px] focus-ring ${
                  activeTab === 'verify'
                    ? 'bg-accent-purple text-white shadow-glow-sm'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                Verify
              </button>
            </div>

            {/* ── Scan tab ── */}
            {activeTab === 'scan' && (
              <div
                role="tabpanel"
                id="tabpanel-scan"
                aria-labelledby="tab-scan"
                className="space-y-4"
              >
                <ScannerCamera
                  isOffline={isOffline}
                  onScan={submitScan}
                  scannerState={scannerState}
                  isPaused={isPaused}
                />

                {/* Last-5 activity strip — mobile only */}
                {!isOffline && (
                  <div className="lg:hidden">
                    <RecentActivityStrip items={historyItems} />
                  </div>
                )}
              </div>
            )}

            {/* ── Verify tab ── */}
            {activeTab === 'verify' && (
              <ScannerVerifyForm
                scannerState={scannerState}
                onSubmit={submitScan}
                onBackToScan={() => setActiveTab('scan')}
              />
            )}
          </div>

          {/* ── Right column: Stats + Desktop History (Secondary on mobile) ── */}
          <div className="order-2 lg:order-2 lg:col-span-7 space-y-6">
            {/* Stats — accordion on mobile, always visible on desktop */}
            <div className="glass rounded-2xl border border-border-subtle bg-background-card/50 overflow-hidden">
              {/* Mobile toggle */}
              <button
                type="button"
                onClick={() => setIsStatsExpanded((prev) => !prev)}
                aria-expanded={isStatsExpanded}
                aria-controls="stats-panel"
                className="w-full flex items-center justify-between px-6 py-4 lg:hidden text-left focus-ring"
              >
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Gate Statistics
                </span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                  className={`text-text-muted transition-transform duration-200 ${isStatsExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div
                id="stats-panel"
                className={`${isStatsExpanded ? 'block' : 'hidden'} lg:block px-4 pb-4 lg:p-4`}
              >
                <ScannerStats stats={stats} isLoading={isLoadingStats} />
              </div>
            </div>

            {/* Full history table — desktop only */}
            <div className="hidden lg:block">
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
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border-subtle p-12 text-center text-text-secondary bg-background-card/30">
          Please select an event above to initialize and open the scanner console.
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
            onSwitchToVerify={handleSwitchToVerify}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
