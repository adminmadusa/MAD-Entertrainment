import React, { useState } from 'react';

import { type AdminTier } from '@/lib/api/admin/tier.service';

import { TicketTierCard } from './TicketTierCard';
import { type GroupInput, type TicketInput, inputCls } from './utils';

export interface TicketGroupCardProps {
  group: GroupInput;
  gIdx: number;
  canRemove: boolean;
  onRemoveGroup: (gIdx: number) => void;
  onUpdateGroupField: (gIdx: number, field: keyof GroupInput, value: string) => void;
  onAddTicket: (gIdx: number) => void;
  onRemoveTicket: (gIdx: number, tIdx: number) => void;
  onUpdateTicketField: (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => void;
  dbTiers: AdminTier[];
  allSelectedTiers: string[];
}

export const TicketGroupCard = React.memo(function TicketGroupCard({
  group,
  gIdx,
  canRemove,
  onRemoveGroup,
  onUpdateGroupField,
  onAddTicket,
  onRemoveTicket,
  onUpdateTicketField,
  dbTiers,
  allSelectedTiers,
}: TicketGroupCardProps) {
  const [expandedTierIdx, setExpandedTierIdx] = useState<number | null>(0);

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6 relative">
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemoveGroup(gIdx)}
          className="absolute top-6 right-6 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
        >
          Remove Group
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-text-secondary text-sm font-medium">Group Name *</label>
          <input
            value={group.name}
            onChange={(e) => onUpdateGroupField(gIdx, 'name', e.target.value)}
            placeholder="e.g. VIP Lounges, Regular Entry"
            required
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-text-secondary text-sm font-medium">Group Identifier (Slug)</label>
          <input
            value={group.slug}
            disabled
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-sm text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Tickets in Group */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="text-text-secondary font-bold text-sm uppercase tracking-wider">
            Ticket Tiers in {group.name || `Group ${gIdx + 1}`}
          </h3>
          <button
            type="button"
            onClick={() => {
              onAddTicket(gIdx);
              setExpandedTierIdx(group.tickets.length);
            }}
            className="text-accent-purple text-xs font-bold hover:underline"
          >
            + Add Ticket Tier
          </button>
        </div>

        <div className="space-y-4">
          {group.tickets.map((ticket, tIdx) => (
            <TicketTierCard
              key={`${gIdx}-${tIdx}`}
              ticket={ticket}
              gIdx={gIdx}
              tIdx={tIdx}
              canRemove={group.tickets.length > 1}
              onRemove={(g, t) => {
                if (expandedTierIdx === t) {
                  setExpandedTierIdx(0);
                } else if (expandedTierIdx !== null && expandedTierIdx > t) {
                  setExpandedTierIdx(expandedTierIdx - 1);
                }
                onRemoveTicket(g, t);
              }}
              onUpdateField={onUpdateTicketField}
              dbTiers={dbTiers}
              allSelectedTiers={allSelectedTiers}
              isExpanded={tIdx === expandedTierIdx}
              onToggleExpand={() => setExpandedTierIdx(tIdx === expandedTierIdx ? null : tIdx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
