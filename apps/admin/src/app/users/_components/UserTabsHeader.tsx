import React from 'react';

import { Button } from '@mad/ui';

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
      <Button
        variant="ghost"
        onClick={() => onTabChange('bookings')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 rounded-none transition-all ${
          activeTab === 'bookings'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Booking History ({bookingsCount})
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTabChange('tickets')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 rounded-none transition-all ${
          activeTab === 'tickets'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Tickets Logs ({ticketsCount})
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTabChange('refunds')}
        className={`py-2 px-1 text-sm font-semibold border-b-2 rounded-none transition-all ${
          activeTab === 'refunds'
            ? 'border-accent-purple text-white'
            : 'border-transparent text-text-muted hover:text-white'
        }`}
      >
        Refunds Logs ({refundsCount})
      </Button>
    </div>
  );
}
