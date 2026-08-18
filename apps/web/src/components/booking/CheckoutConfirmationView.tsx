'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { formatMoney } from '@mad/shared';
import type { Booking, Event } from '@mad/types';

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

  const formattedDate = event?.startDate
    ? new Date(event.startDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const venueDisplay = typeof event?.venue === 'string' ? event.venue : undefined;

  return (
    <div
      className={
        isModal
          ? 'relative text-white p-4 w-full flex flex-col items-center justify-center min-h-[480px]'
          : 'pt-20 pb-20 min-h-screen bg-background text-white relative flex flex-col items-center justify-center w-full px-4'
      }
    >
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      <div
        className={
          isModal
            ? 'max-w-lg w-full mx-auto text-center space-y-4 relative z-10 animate-in fade-in zoom-in-95 duration-500 ease-out'
            : 'max-w-lg w-full glass rounded-[2rem] border border-white/10 p-6 text-center space-y-5 shadow-glow relative z-10 backdrop-blur-xl bg-gradient-to-b from-white/12 to-white/6 animate-in fade-in zoom-in-95 duration-500 ease-out'
        }
      >
        {/* Header checkmark */}
        <div className="flex items-center justify-center gap-2.5 text-emerald-400">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-glow-sm">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black tracking-wide text-white">Booking Confirmed!</h2>
            <p className="text-[11px] text-emerald-400 font-medium">Payment received successfully</p>
          </div>
        </div>

        {/* Event Card with Banner */}
        {event && (
          <div className="glass rounded-2xl border border-white/10 p-4 text-left flex gap-4 items-center bg-white/5">
            {event.bannerImage?.url && (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/30 rounded-xl border border-white/10 overflow-hidden shrink-0">
                <Image
                  src={event.bannerImage.url}
                  alt={event.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm font-bold text-white line-clamp-1">{event.title}</h3>
              {formattedDate && (
                <p className="text-xs text-accent-purple-light font-medium flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{formattedDate}</span>
                </p>
              )}
              {venueDisplay && (
                <p className="text-xs text-text-muted line-clamp-1 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{venueDisplay}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Consolidated Ticket & Reference Details */}
        <div className="glass rounded-2xl border border-white/5 p-4 text-left space-y-3 bg-white/2">
          {/* Booking Reference Badge */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Booking Reference</span>
              <span className="font-mono font-bold text-sm text-white tracking-wider">{booking.bookingId}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs ${
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
                  <span className="text-[10px] font-sans font-bold">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Tickets Purchased */}
          <div className="border-t border-white/5 pt-2.5">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">Passes Purchased</span>
            <div className="space-y-1">
              {booking.tickets.map((t, index) => (
                <TicketSummaryItem key={index} tierName={t.tierName} quantity={t.quantity} price={t.subtotal} currency={currency} />
              ))}
            </div>
          </div>

          {/* Total Paid */}
          <div className="flex justify-between items-center text-xs font-bold pt-2.5 border-t border-white/5">
            <span className="text-text-primary">Total Amount Paid</span>
            <span className="text-accent-cyan font-mono text-sm font-black">
              {formatMoney(booking.totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Next Steps Guidance */}
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-left space-y-1.5">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider">What to do next</div>
          <ul className="text-xs text-text-muted space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Confirmation and tickets sent to <strong className="text-white">{booking.guestEmail || 'your email'}</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-purple-light font-bold">✓</span>
              <span>Present your digital QR pass from My Tickets at the gate</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons: Primary & Secondary */}
        <div className="space-y-2.5 pt-1 w-full">
          <button
            onClick={onViewTickets}
            className="w-full py-3.5 btn-gradient text-white font-black text-sm rounded-xl shadow-glow transition-all active:scale-[0.98] hover:scale-[1.02] flex items-center justify-center gap-2 group cursor-pointer"
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
            <span>View My Tickets</span>
          </button>

          <Link
            href="/events"
            className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-text-secondary hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <span>Explore More Events</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

