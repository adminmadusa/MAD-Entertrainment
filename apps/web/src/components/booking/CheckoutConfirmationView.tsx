'use client';

import { useState } from 'react';
import type { Booking, Event } from '@mad/types';
import { formatMoney } from '@mad/shared';
import { TicketSummaryItem } from './shared/TicketSummaryItem';

export interface CheckoutConfirmationViewProps {
  booking: Booking;
  event?: Event | null;
  isModal: boolean;
  currency: string;
  onViewTickets: () => void;
}

export function CheckoutConfirmationView({
  booking,
  event,
  isModal,
  currency,
  onViewTickets,
}: CheckoutConfirmationViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (booking?.bookingId) {
      navigator.clipboard.writeText(booking.bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={
        isModal
          ? 'relative text-white p-4 w-full flex flex-col items-center justify-center min-h-[450px]'
          : 'pt-20 pb-20 min-h-screen bg-background text-white relative flex flex-col items-center justify-center w-full px-4'
      }
    >
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      <div
        className={
          isModal
            ? 'max-w-md w-full mx-auto text-center space-y-4 relative z-10 animate-in fade-in zoom-in-95 duration-500 ease-out'
            : 'max-w-md w-full glass rounded-[2rem] border border-white/10 p-6 text-center space-y-4 shadow-glow relative z-10 backdrop-blur-xl bg-gradient-to-b from-white/12 to-white/6 animate-in fade-in zoom-in-95 duration-500 ease-out'
        }
      >
        {/* Header checkmark */}
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black tracking-wide text-white">Booking Confirmed</h2>
        </div>

        {/* Clean consolidated info details */}
        <div className="glass rounded-2xl border border-white/5 p-4 text-left space-y-3.5 bg-white/2">
          {/* Event Name */}
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Event</span>
            <span className="text-sm font-bold text-white block mt-0.5">{event?.title}</span>
          </div>

          {/* Date & Time */}
          {event?.startDate && (
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Date & Time</span>
              <span className="text-xs text-text-secondary block mt-0.5">
                {new Date(event.startDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Booking Reference */}
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Booking Reference</span>
            <div className="flex items-center justify-between mt-0.5 gap-2 bg-background/40 border border-white/5 rounded-xl px-3 py-1.5 font-mono text-sm text-white select-all">
              <span className="font-bold tracking-wider">{booking.bookingId}</span>
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  copied
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5'
                }`}
                title="Copy Reference"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[9px] font-sans font-bold pr-0.5">Copied</span>
                  </>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Tickets Purchased */}
          <div className="border-t border-white/5 pt-3">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Tickets Purchased</span>
            <div className="space-y-1">
              {booking.tickets.map((t, index) => (
                <TicketSummaryItem key={index} tierName={t.tierName} quantity={t.quantity} currency={currency} />
              ))}
            </div>
          </div>

          {/* Total Paid */}
          <div className="flex justify-between items-center text-xs font-bold pt-3 border-t border-white/5">
            <span className="text-text-primary">Total Paid</span>
            <span className="text-accent-cyan font-mono text-sm font-black">
              {formatMoney(booking.totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Emailed Confirmation */}
        <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
          We have sent your confirmation email and tickets to{' '}
          <span className="text-white font-semibold underline decoration-accent-purple/30">
            {booking.guestEmail || 'your email'}
          </span>
          .
        </p>

        {/* Action Button */}
        <div className="pt-1 w-full">
          <button
            onClick={onViewTickets}
            className="w-full py-3 btn-gradient text-white font-black text-sm rounded-xl shadow-glow transition-all active:scale-[0.98] hover:scale-[1.02] flex items-center justify-center gap-2 group"
          >
            <svg
              className="w-4 h-4 group-hover:rotate-6 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            View Tickets
          </button>
        </div>
      </div>
    </div>
  );
}
