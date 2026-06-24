import React from 'react';

interface UserTabsHeaderProps {
  activeTab: 'bookings' | 'tickets' | 'refunds';
  onTabChange: (tab: 'bookings' | 'tickets' | 'refunds') => void;
  bookingsCount: number;
  ticketsCount: number;
  refundsCount: number;
}

export default function UserTabsHeader({
  activeTab,
  onTabChange,
  bookingsCount,
  ticketsCount,
  refundsCount,
}: UserTabsHeaderProps) {
  return (
    <div className="flex border-b border-border-subtle gap-4">
      <button
        onClick={() => onTabChange('bookings')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
          activeTab === 'bookings'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Booking History ({bookingsCount})
      </button>
      <button
        onClick={() => onTabChange('tickets')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
          activeTab === 'tickets'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Tickets Logs ({ticketsCount})
      </button>
      <button
        onClick={() => onTabChange('refunds')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 transition-all ${
          activeTab === 'refunds'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Refunds Logs ({refundsCount})
      </button>
    </div>
  );
}
