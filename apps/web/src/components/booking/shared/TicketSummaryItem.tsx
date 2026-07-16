import React from 'react';

import { formatDisplayName } from '@/utils/booking-calculations';

interface TicketSummaryItemProps {
  tierName: string;
  quantity: number;
  price?: number;
  pricePrefix?: string;
  className?: string;
}

export function TicketSummaryItem({
  tierName,
  quantity,
  price,
  pricePrefix = '₹',
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
          {pricePrefix}{price.toLocaleString('en-IN')}
        </span>
      )}
    </div>
  );
}

