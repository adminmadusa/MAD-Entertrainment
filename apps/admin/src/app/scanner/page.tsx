'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

import { ScanHistory } from '@/components/scanner/ScanHistory';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ScannerStats } from '@/components/scanner/ScannerStats';
import { TicketValidationModal } from '@/components/scanner/TicketValidationModal';
import { useScannerState } from '@/hooks/useScannerState';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { ScannerHistoryItem } from '@/lib/api/admin/scanner.service';
import { formatEventDate } from '@mad/utils';

type ActiveTab = 'scan' | 'verify';

const RECENT_ACTIVITY_STATUS: Record<string, { dot: string; text: string }> = {
  SUCCESS: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  OFFLINE_QUEUED: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  ALREADY_SCANNED: { dot: 'bg-amber-500', text: 'text-amber-400' },
  INVALID: { dot: 'bg-red-500', text: 'text-red-400' },
  WRONG_EVENT: { dot: 'bg-red-500', text: 'text-red-400' },
  EXPIRED: { dot: 'bg-orange-500', text: 'text-orange-400' },
  ERROR: { dot: 'bg-red-500', text: 'text-red-400' },
};

function RecentActivityStrip({ items }: { items: ScannerHistoryItem[] }) {
  const recent = items.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="glass rounded-2xl border border-border-subtle p-4 bg-background-card/50 space-y-3">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Recent Activity</h3>
      <div className="space-y-2.5">
        {recent.map((item) => {
          const style = RECENT_ACTIVITY_STATUS[item.status] ?? { dot: 'bg-white/30', text: 'text-text-muted' };
          const label = item.guestName || item.ticketId || item.status.replace('_', ' ');
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${style.text}`}>{label}</p>
                {item.tierName && (
                  <p className="text-[10px] text-text-muted truncate">{item.tierName}</p>
                )}
              </div>
              <span className="text-[10px] text-text-muted flex-shrink-0 tabular-nums">
                {new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [manualCode, setManualCode] = useState('');
  const verifyInputRef = useRef<HTMLInputElement>(null);

  // Camera is paused whenever a result is visible or a scan is in-flight
  const isPaused = lastValidationResult !== null || scannerState === 'Processing';

  // Fetch active events for selection
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: 'published' }],
    queryFn: () => adminGetEvents({ limit: 100 }),
  });

  const events = eventsRes?.items || [];

  // Auto-focus the ticket input when switching to the Verify tab
  useEffect(() => {
    if (activeTab === 'verify') {
      const timeout = setTimeout(() => verifyInputRef.current?.focus(), 120);
      return () => clearTimeout(timeout);
    }
  }, [activeTab]);

  const handleSwitchToVerify = () => {
    setActiveTab('verify');
  };

  // "Next Scan" handler: dismiss result and return to Scan tab if coming from Verify
  const handleNextScan = () => {
    setLastValidationResult(null);
    if (activeTab === 'verify') {
      setActiveTab('scan');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || scannerState === 'Processing') return;
    submitScan(code);
    setManualCode('');
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
          {/* ── Right column: Stats + Desktop History ── */}
          <div className="order-1 lg:order-2 lg:col-span-7 space-y-6">
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

          {/* ── Left column: Tabs + Camera / Verify + Recent Activity ── */}
          <div className="order-2 lg:order-1 lg:col-span-5 space-y-4">
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
              <div
                role="tabpanel"
                id="tabpanel-verify"
                aria-labelledby="tab-verify"
                className="glass rounded-2xl border border-border-subtle p-6 bg-background-card/50 space-y-5"
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Manual Verification</h2>
                  <p className="text-text-muted text-xs mt-1">
                    Use when the QR code is damaged, too dark, or cannot be scanned.
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3" noValidate>
                  <div>
                    <label
                      htmlFor="verify-ticket-input"
                      className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"
                    >
                      Ticket Number
                    </label>
                    <input
                      ref={verifyInputRef}
                      id="verify-ticket-input"
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter Ticket ID (e.g. TKT-XXXX-XXX)"
                      className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 min-h-[44px] text-sm font-mono text-white focus-ring outline-none transition-all"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      enterKeyHint="search"
                      spellCheck={false}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!manualCode.trim() || scannerState === 'Processing'}
                    className="w-full py-4 min-h-[56px] bg-accent-purple hover:bg-accent-purple-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black tracking-wide rounded-xl transition-all focus-ring"
                  >
                    {scannerState === 'Processing' ? 'Verifying...' : 'Verify Ticket'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setActiveTab('scan')}
                  className="w-full py-2.5 min-h-[44px] text-text-muted text-xs font-bold hover:text-white transition-colors focus-ring rounded-xl flex items-center justify-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to Scanner
                </button>
              </div>
            )}
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
