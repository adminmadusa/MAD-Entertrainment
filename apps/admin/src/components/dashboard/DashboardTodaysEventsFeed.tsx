'use client';

import Link from 'next/link';
import React from 'react';

import type { AdminEvent } from '@/lib/api/admin/event.service';
import { EventStatus } from '@mad/shared';
import { formatDateTime } from '@mad/utils';

interface DashboardTodaysEventsFeedProps {
  todaysEvents: AdminEvent[];
  isEventsLoading: boolean;
}

export function DashboardTodaysEventsFeed({
  todaysEvents,
  isEventsLoading,
}: DashboardTodaysEventsFeedProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden flex flex-col justify-between">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">Happening Today</h2>
          <p className="text-text-secondary text-xs mt-0.5">Today&apos;s active event schedules and gate volumes</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium">
          {todaysEvents.length} Active {todaysEvents.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      {isEventsLoading ? (
        <div className="p-8 text-center text-text-secondary animate-pulse">Loading active schedule...</div>
      ) : todaysEvents.length === 0 ? (
        <div className="p-12 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
          <p className="text-text-secondary text-sm">No events scheduled for today.</p>
          <Link href="/events/new" className="inline-block px-4 py-2 bg-white/5 border border-border-subtle rounded-xl text-xs font-semibold text-white hover:bg-white/10 transition-colors">
            + Schedule Event
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle/40 flex-1">
          {todaysEvents.map((event) => {
            const sold = event.ticketsSold ?? 0;
            const capacity = event.totalCapacity ?? 1;
            const pct = Math.min(100, Math.round((sold / capacity) * 100));

            return (
              <div key={event._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${event.status === EventStatus.PUBLISHED ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                    <h3 className="text-white font-bold text-base">{event.title}</h3>
                  </div>
                  <p className="text-text-secondary text-xs">{event.venue}</p>
                  <p className="text-text-secondary text-xs font-mono">
                    Gates: {formatDateTime(event.startDate, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="w-full sm:w-48 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">Capacity Sold ({pct}%)</span>
                    <span className="text-white font-semibold">{sold} / {capacity}</span>
                  </div>
                  <div className="w-full bg-white/5 border border-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-accent-purple h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
