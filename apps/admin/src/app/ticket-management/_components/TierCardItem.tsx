'use client';

import React from 'react';

import type { AdminTier } from '@/lib/api/admin/tier.service';

import { getTierIcon } from './tier-presets';

interface TierCardItemProps {
  tier: AdminTier;
  canMutate: boolean;
  onEdit: (tier: AdminTier) => void;
  onDelete: (id: string) => void;
}

export function TierCardItem({
  tier,
  canMutate,
  onEdit,
  onDelete,
}: TierCardItemProps) {
  return (
    <div
      className="glass rounded-2xl border border-border-subtle p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-white/10"
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
          style={{ backgroundColor: tier.color || '#6366F1' }}
        >
          {getTierIcon(tier.icon || 'ticket')}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-white font-bold text-base">{tier.name}</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-text-muted">
              {tier.slug}
            </span>
            {tier.isActive === false && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                Inactive
              </span>
            )}
          </div>
          <p className="text-text-secondary text-xs mt-1 line-clamp-1 max-w-md">
            {tier.description || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
        <span className="text-xs text-text-muted font-mono mr-2">Pos: {tier.sortIndex ?? 0}</span>
        {canMutate && (
          <>
            <button
              onClick={() => onEdit(tier)}
              className="px-3 py-1.5 glass border border-border-subtle hover:border-white/20 text-xs font-semibold text-text-secondary hover:text-white rounded-xl transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(tier._id)}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold rounded-xl transition-all"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
