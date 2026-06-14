import React from 'react';

interface UserStatsSummaryProps {
  totalBookings: number;
  totalTickets: number;
  totalSpend: number;
}

export default function UserStatsSummary({
  totalBookings,
  totalTickets,
  totalSpend,
}: UserStatsSummaryProps) {
  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
        <span className="text-xs text-text-muted font-medium">Total Bookings</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">{totalBookings}</span>
          <p className="text-[10px] text-text-muted mt-1">Overall orders submitted</p>
        </div>
      </div>
      <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
        <span className="text-xs text-text-muted font-medium">Total Tickets Admitted</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">{totalTickets}</span>
          <p className="text-[10px] text-text-muted mt-1">Confirmed valid entries</p>
        </div>
      </div>
      <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
        <span className="text-xs text-text-muted font-medium">Total Spend</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalSpend)}
          </span>
          <p className="text-[10px] text-text-muted mt-1">Spend on confirmed tickets</p>
        </div>
      </div>
    </div>
  );
}
