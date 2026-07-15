import React from 'react';
import { clsx } from 'clsx';

export interface FloatingActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children?: React.ReactNode;
}

export function FloatingActionBar({ selectedCount, onClearSelection, children }: FloatingActionBarProps) {
  return (
    <div 
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full bg-surface-elevated px-6 py-3 shadow-elevation-high border border-border-default transition-all duration-300',
        selectedCount > 0 ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'
      )}
      role="toolbar" 
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-sm text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded px-1"
          aria-label="Clear selection"
        >
          Clear
        </button>
      </div>
      <div className="h-6 w-px bg-border-default" />
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
