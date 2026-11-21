'use client';

import React from 'react';
import { Button } from '@mad/ui';

export interface TierFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
}

export function TierFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: TierFilterBarProps) {
  return (
    <div className="glass p-4 rounded-2xl border border-border-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="relative w-full sm:max-w-xs">
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tiers by name or slug..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
        />
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onStatusFilterChange('all')}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg ${
            statusFilter === 'all'
              ? 'bg-accent-purple/20 text-accent-purple-light border-accent-purple/30'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          All Tiers
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onStatusFilterChange('active')}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg ${
            statusFilter === 'active'
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Active
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onStatusFilterChange('inactive')}
          className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg ${
            statusFilter === 'inactive'
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Inactive
        </Button>
      </div>
    </div>
  );
}
