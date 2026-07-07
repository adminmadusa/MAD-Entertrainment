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
      <div className="glass rounded-xl border border-border-subtle border-l-2 border-l-sky-500/60 p-4 bg-background-card/30 shadow-sm transition-all hover:translate-y-[-1px]">
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Total Active</p>
        <p className="text-xl md:text-2xl font-black text-white mt-1">
          {isLoading ? '...' : stats.totalTickets}
        </p>
      </div>

      {/* Checked In */}
      <div className="glass rounded-xl border border-border-subtle border-l-2 border-l-emerald-500/60 p-4 bg-background-card/30 shadow-sm transition-all hover:translate-y-[-1px]">
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Checked In</p>
        <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
          {isLoading ? '...' : stats.checkedIn}
        </p>
      </div>

      {/* Remaining */}
      <div className="glass rounded-xl border border-border-subtle border-l-2 border-l-zinc-500/60 p-4 bg-background-card/30 shadow-sm transition-all hover:translate-y-[-1px]">
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Remaining</p>
        <p className="text-xl md:text-2xl font-black text-white mt-1">
          {isLoading ? '...' : stats.remaining}
        </p>
      </div>

      {/* Success Rate */}
      <div className="glass rounded-xl border border-border-subtle border-l-2 border-l-purple-500/60 p-4 bg-background-card/30 shadow-sm transition-all hover:translate-y-[-1px]">
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Gate Success Rate</p>
        <p className="text-xl md:text-2xl font-black text-accent-purple mt-1">
          {isLoading ? '...' : `${stats.successRate}%`}
        </p>
      </div>

      {/* Duplicates / Failed */}
      <div className="glass col-span-2 md:col-span-4 rounded-xl border border-border-subtle p-4 bg-background-card/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider">
          <div className="flex items-center">
            <span className="text-text-muted mr-2">Duplicates:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              (stats.duplicateScans ?? 0) > 0
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-glow-sm'
                : 'text-text-secondary border border-transparent'
            }`}>
              {stats.duplicateScans ?? 0}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-text-muted mr-2">Failures:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              (stats.failedScans ?? 0) > 0
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 shadow-glow-sm animate-pulse'
                : 'text-text-secondary border border-transparent'
            }`}>
              {stats.failedScans ?? 0}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-text-muted mr-2">Synced Offline:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              (stats.offlineSynced ?? 0) > 0
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'text-text-secondary border border-transparent'
            }`}>
              {stats.offlineSynced ?? 0}
            </span>
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
