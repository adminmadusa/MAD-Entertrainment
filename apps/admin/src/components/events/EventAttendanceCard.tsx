import React from 'react';
import { type AdminEvent } from '@/lib/api/admin/event.service';

export interface EventAttendanceCardProps {
  event: AdminEvent;
}

export const EventAttendanceCard = React.memo(function EventAttendanceCard({ event }: EventAttendanceCardProps) {
  const ticketsCheckedIn = event.ticketsCheckedIn ?? 0;
  const ticketsSold = event.ticketsSold ?? 0;

  let attendanceStatus = 'NO ATTENDANCE';
  let attendanceColorClass = 'bg-red-500/10 text-red-400 border-red-500/30';

  if (ticketsCheckedIn > 0) {
    if (ticketsCheckedIn === ticketsSold) {
      attendanceStatus = 'FULLY ATTENDED';
      attendanceColorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else {
      attendanceStatus = 'PARTIALLY ATTENDED';
      attendanceColorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    }
  }

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base">Event Attendance</h2>
          <p className="text-text-muted text-xs mt-0.5">Real-time gate check-in telemetry</p>
        </div>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${attendanceColorClass}`}>
          {attendanceStatus}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center bg-white/3 rounded-xl p-4 text-sm">
        <div className="space-y-1">
          <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Tickets Sold</span>
          <span className="text-white font-black text-xl">{ticketsSold}</span>
        </div>
        <div className="space-y-1 border-x border-white/5">
          <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Checked In</span>
          <span className="text-emerald-400 font-black text-xl">{ticketsCheckedIn}</span>
        </div>
        <div className="space-y-1">
          <span className="text-text-muted text-[10px] uppercase tracking-wider block font-semibold">Remaining</span>
          <span className="text-white font-black text-xl">{event.ticketsRemaining ?? 0}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-text-secondary font-medium">
          <span>Check-in Progress</span>
          <span>{Math.round(event.attendancePercentage ?? 0)}%</span>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, event.attendancePercentage ?? 0))}%` }}
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-white/5">
        <div className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-lg">
          <span className="text-text-muted font-medium">Attendance Rate</span>
          <span className="text-emerald-400 font-bold">{Math.round(event.attendancePercentage ?? 0)}%</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-lg">
          <span className="text-text-muted font-medium">No Show Rate</span>
          <span className="text-red-400 font-bold">{Math.round(event.noShowPercentage ?? 0)}%</span>
        </div>
      </div>
    </div>
  );
});
