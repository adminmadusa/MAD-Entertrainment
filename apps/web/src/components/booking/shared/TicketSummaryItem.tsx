import React from 'react';

import { formatDisplayName } from '@/utils/booking-calculations';
import { formatMoney } from '@mad/shared';

interface TicketSummaryItemProps {
  tierName: string;
  quantity: number;
  price?: number;
  currency?: string;
  className?: string;
}

export function TicketSummaryItem({
  tierName,
  quantity,
  price,
  currency = 'USD',
  className = '',
}: TicketSummaryItemProps) {
  if (quantity <= 0) return null;
  return (
    <div className={`flex justify-between items-center text-xs py-0.5 sm:py-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-bold text-white shrink-0">{quantity}×</span>
        <span
          className="text-text-secondary truncate text-[11px] sm:text-xs"
          title={formatDisplayName(tierName)}
        >
          {formatDisplayName(tierName)}
        </span>
      </div>
      {price !== undefined && (
        <span className="font-semibold text-accent-purple-light font-mono text-[11px] sm:text-xs">
          {formatMoney(price, currency)}
        </span>
      )}
    </div>
  );
}
