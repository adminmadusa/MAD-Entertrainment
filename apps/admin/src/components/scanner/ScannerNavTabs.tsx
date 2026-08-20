import React from 'react';

import type { ScannerStats } from '@/lib/api/admin/scanner.service';

export type ScannerActiveTab = 'scan' | 'verify' | 'stats' | 'history';

interface ScannerNavTabsProps {
  activeTab: ScannerActiveTab;
  onSelectTab: (tab: ScannerActiveTab) => void;
  stats?: ScannerStats | null;
}

export function ScannerNavTabs({
  activeTab,
  onSelectTab,
  stats,
}: ScannerNavTabsProps) {
  return (
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
        onClick={() => onSelectTab('scan')}
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
        onClick={() => onSelectTab('verify')}
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
        onClick={() => onSelectTab('stats')}
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
        onClick={() => onSelectTab('history')}
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
  );
}
