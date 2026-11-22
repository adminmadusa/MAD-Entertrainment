'use client';

import React from 'react';
import { Button } from '@mad/ui';

export type TicketSubTabKey = 'upcoming' | 'live' | 'past' | 'cancelled' | 'refunded';

export interface DashboardTicketsSubTabsProps {
  activeTab: TicketSubTabKey;
  onTabChange: (tab: TicketSubTabKey) => void;
  upcomingCount: number;
  liveCount: number;
  pastCount: number;
  cancelledCount: number;
  refundedCount: number;
}

export function DashboardTicketsSubTabs({
  activeTab,
  onTabChange,
  upcomingCount,
  liveCount,
  pastCount,
  cancelledCount,
  refundedCount,
}: DashboardTicketsSubTabsProps) {
  const tabs: { key: TicketSubTabKey; label: string; count: number }[] = [
    { key: 'live', label: 'Live', count: liveCount },
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { key: 'past', label: 'Past Events', count: pastCount },
    { key: 'cancelled', label: 'Cancelled', count: cancelledCount },
    { key: 'refunded', label: 'Refunded', count: refundedCount },
  ];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1 w-full"
      role="tablist"
      aria-label="Ticket categories"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Button
            key={tab.key}
            type="button"
            variant="ghost"
            role="tab"
            id={`subtab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`subtab-panel-${tab.key}`}
            onClick={() => onTabChange(tab.key)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold rounded-full transition-all duration-200 min-h-[44px] h-auto flex items-center gap-2 border ${
              isActive
                ? 'bg-white text-black font-extrabold shadow-md border-transparent hover:bg-white hover:text-black'
                : 'text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-black/10 text-black font-black' : 'bg-white/10 text-text-muted'
              }`}
            >
              {tab.count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
