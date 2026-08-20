'use client';

import React from 'react';

import { formatDateTime } from '@mad/utils';

export interface IndividualTicket {
  ticketId: string;
  status: string;
  createdAt: string | Date;
  replacedAt?: string | Date;
  replacedByTicketId?: string;
  replacementReason?: string;
}

export interface BookingIndividualTicketsProps {
  tickets: IndividualTicket[];
  selectedTicketIds: string[];
  canMutateBookings: boolean;
  isConfirmed: boolean;
  onTicketToggle: (ticketId: string) => void;
  onSelectAllActive: () => void;
}

export function BookingIndividualTickets({
  tickets,
  selectedTicketIds,
  canMutateBookings,
  isConfirmed,
  onTicketToggle,
  onSelectAllActive,
}: BookingIndividualTicketsProps) {
  if (!tickets || tickets.length === 0) return null;

  return (
    <div className="border-t border-white/5 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider">Individual Tickets & QR Status</h4>
        {canMutateBookings && isConfirmed && (
          <button
            type="button"
            onClick={onSelectAllActive}
            className="text-[10px] text-accent-purple hover:text-white transition-colors uppercase font-semibold"
          >
            Select All Active
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {tickets.map((t, idx) => (
          <div key={idx} className="bg-white/5 rounded-xl p-2.5 text-[11px] space-y-1 border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {t.status === 'active' && canMutateBookings && (
                  <input
                    type="checkbox"
                    checked={selectedTicketIds.includes(t.ticketId)}
                    onChange={() => onTicketToggle(t.ticketId)}
                    className="w-3.5 h-3.5 rounded border-border-subtle bg-background/50 accent-accent-purple"
                  />
                )}
                <span className="text-white font-mono font-semibold">{t.ticketId}</span>
              </div>
              <span
                className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                  t.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : t.status === 'replaced'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {t.status}
              </span>
            </div>
            <div className="text-[10px] text-text-muted space-y-0.5">
              <p>Created: {formatDateTime(t.createdAt)}</p>
              {t.replacedAt && <p>Replaced: {formatDateTime(t.replacedAt)}</p>}
              {t.replacedByTicketId && <p className="font-mono text-accent-purple">Replaced by: {t.replacedByTicketId}</p>}
              {t.replacementReason && <p className="italic">Reason: {t.replacementReason}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
