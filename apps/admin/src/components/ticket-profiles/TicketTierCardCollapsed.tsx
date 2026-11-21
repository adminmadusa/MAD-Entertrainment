import React from 'react';
import { Button } from '@mad/ui';
import type { TicketInput } from './utils';

export interface TicketTierCardCollapsedProps {
  ticket: TicketInput;
  tIdx: number;
  gIdx: number;
  canRemove: boolean;
  onRemove: (gIdx: number, tIdx: number) => void;
  onToggleExpand: () => void;
}

export const TicketTierCardCollapsed = React.memo(function TicketTierCardCollapsed({
  ticket,
  tIdx,
  gIdx,
  canRemove,
  onRemove,
  onToggleExpand,
}: TicketTierCardCollapsedProps) {
  return (
    <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 flex items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-text-secondary text-[11px] font-bold uppercase tracking-wider">
          Tier {tIdx + 1}:
        </span>
        <span className="text-white font-extrabold text-sm">
          {ticket.name || <span className="text-text-muted/40 italic">Unnamed Tier</span>}
        </span>
        <span className="text-accent-purple-light text-xs font-semibold">
          ({ticket.isFree ? 'Free' : ticket.price !== '' ? `$${ticket.price}` : '$0'})
        </span>
      </div>

      <div className="flex items-center gap-4">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(gIdx, tIdx)}
            className="text-red-400/80 hover:text-red-400 text-xs font-medium transition-colors p-0 h-auto"
          >
            Remove
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="text-accent-purple text-xs font-bold hover:underline flex items-center gap-1 p-0 h-auto"
        >
          Expand Details ▼
        </Button>
      </div>
    </div>
  );
});
