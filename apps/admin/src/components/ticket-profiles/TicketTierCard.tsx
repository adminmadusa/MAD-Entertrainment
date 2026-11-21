import React from 'react';

import { type AdminTier } from '@/lib/api/admin/tier.service';
import { Button } from '@mad/ui';

import { OfferRulesSection } from './OfferRulesSection';
import { TicketTierCardCollapsed } from './TicketTierCardCollapsed';
import { TicketTierCardFields } from './TicketTierCardFields';
import { type TicketInput } from './utils';

export interface TicketTierCardProps {
  ticket: TicketInput;
  gIdx: number;
  tIdx: number;
  canRemove: boolean;
  onRemove: (gIdx: number, tIdx: number) => void;
  onUpdateField: (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => void;
  dbTiers: AdminTier[];
  allSelectedTiers: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TicketTierCard = React.memo(function TicketTierCard({
  ticket,
  gIdx,
  tIdx,
  canRemove,
  onRemove,
  onUpdateField,
  dbTiers,
  allSelectedTiers,
  isExpanded,
  onToggleExpand,
}: TicketTierCardProps) {
  // Collapsed View
  if (!isExpanded) {
    return (
      <TicketTierCardCollapsed
        ticket={ticket}
        tIdx={tIdx}
        gIdx={gIdx}
        canRemove={canRemove}
        onRemove={onRemove}
        onToggleExpand={onToggleExpand}
      />
    );
  }

  // Expanded View
  return (
    <div className="p-5 bg-white/[0.02] rounded-xl border border-white/5 space-y-5 relative transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">
          Tier {tIdx + 1} Configuration
        </span>
        <div className="flex items-center gap-4">
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(gIdx, tIdx)}
              className="text-red-400/80 hover:text-red-400 text-xs font-medium transition-colors p-0 h-auto"
            >
              Remove Tier
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="text-accent-purple text-xs font-bold hover:underline p-0 h-auto"
          >
            Collapse ▲
          </Button>
        </div>
      </div>

      {/* Form Fields */}
      <TicketTierCardFields
        ticket={ticket}
        gIdx={gIdx}
        tIdx={tIdx}
        dbTiers={dbTiers}
        allSelectedTiers={allSelectedTiers}
        onUpdateField={onUpdateField}
      />

      {/* Offer Rules Section */}
      <OfferRulesSection
        ticket={ticket}
        gIdx={gIdx}
        tIdx={tIdx}
        onUpdateField={onUpdateField}
      />
    </div>
  );
});
