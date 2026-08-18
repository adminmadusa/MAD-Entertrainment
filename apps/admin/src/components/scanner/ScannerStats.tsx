'use client';

import { ScannerStats as StatsType } from '../../lib/api/admin/scanner.service';

interface ScannerStatsProps {
  stats: StatsType | null;
  isLoading: boolean;
}

export function ScannerStats({ stats, isLoading }: ScannerStatsProps) {
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Gate Attendance & Capacity</h2>
          <p className="text-text-muted text-xs mt-0.5">Real-time check-in telemetry and gate entry metrics</p>
        </div>
        <span className="text-xs text-text-secondary">
          Live sync active
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="glass rounded-2xl border border-border-subtle p-5 bg-background-card/50 shadow-sm transition-all hover:border-sky-500/30">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Total Active</p>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2 tabular-nums">
            {isLoading ? '...' : stats.totalTickets}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Confirmed tickets eligible for entry</p>
        </div>

        {/* Checked In */}
        <div className="glass rounded-2xl border border-border-subtle p-5 bg-background-card/50 shadow-sm transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Checked In</p>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 tabular-nums">
            {isLoading ? '...' : stats.checkedIn}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Attendees admitted at the gate</p>
        </div>

        {/* Remaining */}
        <div className="glass rounded-2xl border border-border-subtle p-5 bg-background-card/50 shadow-sm transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Remaining</p>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2 tabular-nums">
            {isLoading ? '...' : stats.remaining}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Expected attendees remaining in queue</p>
        </div>

        {/* Success Rate */}
        <div className="glass rounded-2xl border border-border-subtle p-5 bg-background-card/50 shadow-sm transition-all hover:border-accent-purple/30">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Gate Success Rate</p>
            <span className="w-2 h-2 rounded-full bg-accent-purple" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-accent-purple mt-2 tabular-nums">
            {isLoading ? '...' : `${stats.successRate}%`}
          </p>
          <p className="text-[11px] text-text-muted mt-1">First-attempt validation ratio</p>
        </div>
      </div>

      {/* Operational Health & Sync Panel */}
      <div className="glass rounded-2xl border border-border-subtle p-5 bg-background-card/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-medium">Duplicate Scans:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              (stats.duplicateScans ?? 0) > 0
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                : 'text-text-muted'
            }`}>
              {stats.duplicateScans ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-medium">Rejected / Invalid:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              (stats.failedScans ?? 0) > 0
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'text-text-muted'
            }`}>
              {stats.failedScans ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-medium">Synced Offline:</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              (stats.offlineSynced ?? 0) > 0
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'text-text-muted'
            }`}>
              {stats.offlineSynced ?? 0}
            </span>
          </div>
        </div>

        {stats.offlinePending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs text-amber-400 font-bold animate-pulse">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            <span>{stats.offlinePending} scans in offline queue</span>
          </div>
        )}
      </div>
    </div>
  );
}
