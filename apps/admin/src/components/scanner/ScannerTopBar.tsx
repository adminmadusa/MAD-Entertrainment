import React from 'react';

import { formatEventDate } from '@mad/utils';

interface ScannerTopBarProps {
  isOffline: boolean;
  offlineCount: number;
  selectedEventId: string;
  onSelectEventId: (eventId: string) => void;
  isLoadingEvents: boolean;
  events: Array<{ _id: string; title: string; startDate?: string | Date }>;
}

export function ScannerTopBar({
  isOffline,
  offlineCount,
  selectedEventId,
  onSelectEventId,
  isLoadingEvents,
  events,
}: ScannerTopBarProps) {
  return (
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
          onChange={(e) => onSelectEventId(e.target.value)}
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
  );
}
