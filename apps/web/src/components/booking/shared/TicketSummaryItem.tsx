import React from 'react';

import { formatMoney } from '@mad/shared';
import { formatDisplayName } from '@/utils/booking-calculations';

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
    <div className={`flex justify-between items-center text-xs py-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="font-bold text-white">{quantity}×</span>
        <span className="text-text-secondary">{formatDisplayName(tierName)}</span>
      </div>
      {price !== undefined && (
        <span className="font-semibold text-accent-purple-light font-mono">
          {formatMoney(price, currency)}
        </span>
      )}
    </div>
  );
}


