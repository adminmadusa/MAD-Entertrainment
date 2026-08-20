'use client';

import React from 'react';

interface DashboardHeaderProps {
  userName: string;
  totalBookings: number;
  upcomingCount: number;
}

export function DashboardHeader({
  userName,
  totalBookings,
  upcomingCount,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-white/5">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          My Dashboard
        </h1>
        <p className="text-text-secondary text-sm">
          Welcome back, <span className="text-white font-semibold">{userName}</span>
        </p>
      </div>
      {totalBookings > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-secondary font-medium">
            <span className="text-white font-bold">{upcomingCount}</span> Upcoming {upcomingCount === 1 ? 'Event' : 'Events'}
          </span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-secondary font-medium">
            <span className="text-white font-bold">{totalBookings}</span> Total {totalBookings === 1 ? 'Pass' : 'Passes'}
          </span>
        </div>
      )}
    </div>
  );
}
