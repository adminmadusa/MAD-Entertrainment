import React from 'react';

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
      <div>
        <div className="font-bold text-white">{tierName}</div>
        <div className="text-text-muted text-[11px] mt-0.5">
          {quantity} {quantity === 1 ? 'Ticket' : 'Tickets'}
        </div>
      </div>
      {price !== undefined && (
        <span className="font-semibold text-accent-purple-light font-mono">
          {pricePrefix}{price.toLocaleString('en-IN')}
        </span>
      )}
    </div>
  );
}
