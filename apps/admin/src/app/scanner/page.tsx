'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { RecentActivityStrip } from '@/components/scanner/RecentActivityStrip';
import { ScanHistory } from '@/components/scanner/ScanHistory';
import { ScannerCamera } from '@/components/scanner/ScannerCamera';
import { ScannerNavTabs, type ScannerActiveTab } from '@/components/scanner/ScannerNavTabs';
import { ScannerStats } from '@/components/scanner/ScannerStats';
import { ScannerTopBar } from '@/components/scanner/ScannerTopBar';
import { ScannerVerifyForm } from '@/components/scanner/ScannerVerifyForm';
import { TicketValidationModal } from '@/components/scanner/TicketValidationModal';
import { useScannerState } from '@/hooks/useScannerState';
import { adminGetEvents } from '@/lib/api/admin/event.service';
import { EventStatus, isEventLiveForScanning } from '@mad/shared';
import { Button } from '@mad/ui';

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

  const [activeTab, setActiveTab] = useState<ScannerActiveTab>('scan');

  // Camera is paused whenever a result is visible, a scan is in-flight, or not on scan tab
  const isPaused = lastValidationResult !== null || scannerState === 'Processing' || activeTab !== 'scan';

  // Fetch published events for selection and restrict strictly to live events (SSOT)
  const { data: eventsRes, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-events', { status: EventStatus.PUBLISHED }],
    queryFn: () => adminGetEvents({ limit: 100, status: EventStatus.PUBLISHED }),
  });

  const events = (eventsRes?.items || []).filter((ev) => isEventLiveForScanning(ev));

  const handleNextScan = () => {
    setLastValidationResult(null);
    if (activeTab === 'verify') {
      setActiveTab('scan');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 pb-12">
      {/* Unified Top Control Bar */}
      <ScannerTopBar
        isOffline={isOffline}
        offlineCount={offlineCount}
        selectedEventId={selectedEventId}
        onSelectEventId={(id) => {
          setSelectedEventId(id);
          setLastValidationResult(null);
        }}
        isLoadingEvents={isLoadingEvents}
        events={events}
      />

      {/* Sync result banner */}
      {syncResultSummary && (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{syncResultSummary}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSyncResultSummary(null)}
            aria-label="Dismiss sync result"
          >
            Dismiss
          </Button>
        </div>
      )}

      {selectedEventId ? (
        <div className="space-y-6">
          {/* 4-Tab Navigation Bar */}
          <ScannerNavTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            stats={stats}
          />

          {/* Tab Content Panels */}
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
        <div className="glass rounded-2xl border border-border-subtle p-8 sm:p-12 text-center text-text-secondary bg-background-card/30 space-y-2">
          <p className="text-base font-bold text-white">
            {events.length === 0 ? 'No Live Events Today' : 'No Event Selected'}
          </p>
          <p className="text-xs text-text-muted">
            {events.length === 0
              ? 'There are currently no active or live events scheduled for check-in today.'
              : 'Please choose an active target event from the dropdown above to initialize the gate scanner.'}
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
