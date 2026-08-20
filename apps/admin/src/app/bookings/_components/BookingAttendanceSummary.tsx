'use client';

import React from 'react';

const ATTENDANCE_COLORS: Record<string, string> = {
  NOT_ATTENDED: 'bg-red-500/10 text-red-400 border-red-500/30',
  PARTIALLY_ATTENDED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  FULLY_ATTENDED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export interface BookingAttendanceSummaryProps {
  attendanceStatus?: string;
  totalTickets?: number;
  ticketsScanned?: number;
  ticketsRemaining?: number;
}

export function BookingAttendanceSummary({
  attendanceStatus,
  totalTickets = 0,
  ticketsScanned = 0,
  ticketsRemaining = 0,
}: BookingAttendanceSummaryProps) {
  return (
    <div className="border-t border-white/5 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Attendance Status</h4>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${ATTENDANCE_COLORS[attendanceStatus ?? 'NOT_ATTENDED']}`}>
          {attendanceStatus?.replace('_', ' ') ?? 'NOT ATTENDED'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center bg-white/5 rounded-xl p-2.5 text-xs">
        <div className="space-y-0.5">
          <span className="text-text-muted text-[9px] uppercase tracking-wider block">Purchased</span>
          <span className="text-white font-black text-sm">{totalTickets}</span>
        </div>
        <div className="space-y-0.5 border-x border-white/5">
          <span className="text-text-muted text-[9px] uppercase tracking-wider block">Checked In</span>
          <span className="text-emerald-400 font-black text-sm">{ticketsScanned}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-text-muted text-[9px] uppercase tracking-wider block">Remaining</span>
          <span className="text-white font-black text-sm">{ticketsRemaining}</span>
        </div>
      </div>
    </div>
  );
}
