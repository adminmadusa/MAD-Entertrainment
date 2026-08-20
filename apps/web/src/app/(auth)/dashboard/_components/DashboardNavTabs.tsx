import React from 'react';

export type TabType = 'tickets' | 'account' | 'support';

interface DashboardNavTabsProps {
  activeTab: TabType;
  bookingsCount: number;
  onTabChange: (tab: TabType) => void;
}

export function DashboardNavTabs({
  activeTab,
  bookingsCount,
  onTabChange,
}: DashboardNavTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard navigation"
      className="flex items-center gap-6 sm:gap-8 border-b border-white/10 overflow-x-auto scrollbar-none"
    >
      <button
        type="button"
        role="tab"
        id="subtab-tickets"
        aria-controls="subtab-panel-tickets"
        aria-selected={activeTab === 'tickets'}
        onClick={() => onTabChange('tickets')}
        className={`pb-3 text-sm font-bold transition-all duration-200 relative whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
          activeTab === 'tickets'
            ? 'text-white'
            : 'text-text-secondary hover:text-white'
        }`}
      >
        <span>My Tickets</span>
        {bookingsCount > 0 && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'tickets'
                ? 'bg-accent-purple text-white'
                : 'bg-white/10 text-text-secondary'
            }`}
          >
            {bookingsCount}
          </span>
        )}
        {activeTab === 'tickets' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-purple to-pink-500 rounded-full" />
        )}
      </button>

      <button
        type="button"
        role="tab"
        id="subtab-account"
        aria-controls="subtab-panel-account"
        aria-selected={activeTab === 'account'}
        onClick={() => onTabChange('account')}
        className={`pb-3 text-sm font-bold transition-all duration-200 relative whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
          activeTab === 'account'
            ? 'text-white'
            : 'text-text-secondary hover:text-white'
        }`}
      >
        <span>Account Details</span>
        {activeTab === 'account' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-purple to-pink-500 rounded-full" />
        )}
      </button>

      <button
        type="button"
        role="tab"
        id="subtab-support"
        aria-controls="subtab-panel-support"
        aria-selected={activeTab === 'support'}
        onClick={() => onTabChange('support')}
        className={`pb-3 text-sm font-bold transition-all duration-200 relative whitespace-nowrap min-h-[44px] flex items-center gap-2 ${
          activeTab === 'support'
            ? 'text-white'
            : 'text-text-secondary hover:text-white'
        }`}
      >
        <span>Help &amp; Support</span>
        {activeTab === 'support' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-purple to-pink-500 rounded-full" />
        )}
      </button>
    </div>
  );
}
