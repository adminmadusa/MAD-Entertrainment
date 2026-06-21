import React from 'react';

interface UserStatsSummaryProps {
  totalBookings: number;
  totalTickets: number;
  totalSpend: number;
  lifetimeGrossSpend?: number;
  lifetimeRefunds?: number;
  lifetimeNetSpend?: number;
}

export default function UserStatsSummary({
  totalBookings,
  totalTickets,
  totalSpend,
  lifetimeGrossSpend,
  lifetimeRefunds,
  lifetimeNetSpend,
}: UserStatsSummaryProps) {
  const gross = lifetimeGrossSpend ?? totalSpend;
  const refunds = lifetimeRefunds ?? 0;
  const net = lifetimeNetSpend ?? totalSpend;

  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <span className="text-xs text-text-muted font-medium">Gross Spend</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(gross)}
          </span>
          <p className="text-[10px] text-text-muted mt-1">Total purchase value</p>
        </div>
      </div>
      <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
        <span className="text-xs text-text-muted font-medium">Refunds</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(refunds)}
          </span>
          <p className="text-[10px] text-text-muted mt-1">Returned money value</p>
        </div>
      </div>
      <div className="glass p-6 rounded-2xl border border-border-subtle/50 flex flex-col justify-between">
        <span className="text-xs text-text-muted font-medium">Net Spend</span>
        <div className="mt-4">
          <span className="text-3xl font-black text-white">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(net)}
          </span>
          <p className="text-[10px] text-text-muted mt-1">Spend on confirmed entries</p>
        </div>
      </div>
    </div>
  );
}
