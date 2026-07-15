'use client';

import React from 'react';
import { clsx } from 'clsx';
import type { BulkActionConfig, BulkProgress } from '@mad/types';
import { Button } from '../../primitives/Button';
import { Spinner } from '../../primitives/Spinner';

export type ActionPhase = 'idle' | 'loading' | 'confirming' | 'success' | 'error';

export interface FloatingActionBarProps<TId = string> {
  selectedCount: number;
  onClearSelection: () => void;
  actions?: BulkActionConfig<TId>[];
  onAction?: (actionId: string, selectedIds?: Set<TId>) => void;
  phase?: ActionPhase;
  progress?: BulkProgress;
  children?: React.ReactNode;
}

export function FloatingActionBar<TId = string>({ 
  selectedCount, 
  onClearSelection, 
  actions,
  onAction,
  phase = 'idle',
  progress,
  children 
}: FloatingActionBarProps<TId>) {
  const hasActions = actions && actions.length > 0;
  
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
          disabled={phase === 'loading'}
        >
          Clear
        </button>
      </div>
      <div className="h-6 w-px bg-border-default" />
      <div className="flex items-center gap-2">
        {hasActions ? (
          <>
            {phase === 'loading' && progress && (
              <span className="text-sm text-text-secondary mr-2 flex items-center gap-2">
                <Spinner size="sm" />
                {progress.completed} / {progress.total}
              </span>
            )}
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant === 'destructive' || action.danger ? 'danger' : 'secondary'}
                size="sm"
                disabled={action.disabled || phase === 'loading' || phase === 'confirming'}
                onClick={() => onAction?.(action.id)}
                leftIcon={action.icon as React.ReactNode}
                className={clsx(action.danger && 'text-red-500 border-red-500 hover:bg-red-500/10')}
              >
                {phase === 'loading' && action.loadingLabel ? action.loadingLabel : action.label}
              </Button>
            ))}
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

