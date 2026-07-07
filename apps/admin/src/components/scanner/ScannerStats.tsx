'use client';

import { ScannerStats as StatsType } from '../../lib/api/admin/scanner.service';

interface ScannerStatsProps {
  stats: StatsType | null;
  isLoading: boolean;
}

export function ScannerStats({ stats, isLoading }: ScannerStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Tickets */}
      <div className="glass rounded-xl border border-border-subtle p-4 bg-background-card/30">
        <p className="text-text-muted text-xxs font-bold uppercase tracking-wider">Total Active</p>
        <p className="text-xl md:text-2xl font-black text-white mt-1">
          {isLoading ? '...' : stats.totalTickets}
        </p>
      </div>

      {/* Checked In */}
      <div className="glass rounded-xl border border-border-subtle p-4 bg-background-card/30">
        <p className="text-text-muted text-xxs font-bold uppercase tracking-wider">Checked In</p>
        <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
          {isLoading ? '...' : stats.checkedIn}
        </p>
      </div>

      {/* Remaining */}
      <div className="glass rounded-xl border border-border-subtle p-4 bg-background-card/30">
        <p className="text-text-muted text-xxs font-bold uppercase tracking-wider">Remaining</p>
        <p className="text-xl md:text-2xl font-black text-white mt-1">
          {isLoading ? '...' : stats.remaining}
        </p>
      </div>

      {/* Success Rate */}
      <div className="glass rounded-xl border border-border-subtle p-4 bg-background-card/30">
        <p className="text-text-muted text-xxs font-bold uppercase tracking-wider">Gate Success Rate</p>
        <p className="text-xl md:text-2xl font-black text-accent-purple mt-1">
          {isLoading ? '...' : `${stats.successRate}%`}
        </p>
      </div>

      {/* Duplicates / Failed */}
      <div className="glass col-span-2 md:col-span-4 rounded-xl border border-border-subtle p-4 bg-background-card/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Duplicates:</span>
            <span className="text-sm font-bold text-amber-400 ml-2">{stats.duplicateScans}</span>
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Failures:</span>
            <span className="text-sm font-bold text-red-400 ml-2">{stats.failedScans}</span>
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-text-muted">Synced Offline:</span>
            <span className="text-sm font-bold text-emerald-400 ml-2">{stats.offlineSynced}</span>
          </div>
        </div>

        {stats.offlinePending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg text-xs text-amber-400 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            {stats.offlinePending} offline queue pending sync
          </div>
        )}
      </div>
    </div>
  );
}
