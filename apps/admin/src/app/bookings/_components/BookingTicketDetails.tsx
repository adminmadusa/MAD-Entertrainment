'use client';

import React from 'react';

export interface BookingTicketItem {
  tierName: string;
  quantity: number;
  price: number;
}

export interface BookingTicketDetailsProps {
  tickets: BookingTicketItem[];
  totalAmount: number;
}

export function BookingTicketDetails({ tickets, totalAmount }: BookingTicketDetailsProps) {
  return (
    <div className="border-t border-white/5 pt-3">
      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-2">Ticket Details</h4>
      <div className="space-y-1.5">
        {tickets.map((t, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <div>
              <p className="text-white font-medium">{t.tierName}</p>
              <p className="text-text-muted text-[10px]">₹{t.price.toLocaleString('en-IN')} × {t.quantity}</p>
            </div>
            <span className="text-white font-semibold">₹{(t.price * t.quantity).toLocaleString('en-IN')}</span>
          </div>
        ))}
        <div className="flex justify-between items-center text-sm border-t border-white/5 pt-2 mt-2">
          <span className="text-text-secondary font-medium">Grand Total</span>
          <span className="text-accent-purple text-sm font-black">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}
