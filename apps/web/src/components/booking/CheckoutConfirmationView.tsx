'use client';

import { Check, Copy, Download, ShieldCheck, Ticket as TicketIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { apiClient } from '@/lib/api/client';
import { getStoredGuestBookingSession } from '@/lib/api/public.service';
import { useAuthModal } from '@/providers/AuthModalProvider';
import { useAuth } from '@/providers/AuthProvider';
import { formatMoney } from '@mad/shared';
import type { Booking, Event, Ticket } from '@mad/types';

import { TicketSummaryItem } from './shared/TicketSummaryItem';

export interface CheckoutConfirmationViewProps {
  booking: Booking;
  event?: Event | null;
  isModal: boolean;
  currency: string;
  onViewTickets: () => void;
  onClose?: () => void;
  tickets?: Ticket[];
  ticketsReady?: boolean;
}

export function CheckoutConfirmationView({
  booking,
  event,
  isModal,
  currency,
  onViewTickets,
  onClose: _onClose,
  tickets: _tickets = [],
  ticketsReady: _ticketsReady,
}: CheckoutConfirmationViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const eventTitle = event?.title || 'Your Event';
  const eventDate = event?.startDate ? new Date(event.startDate) : null;
  const formattedDate = eventDate
    ? new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(eventDate)
    : null;
  const venueDisplay = typeof event?.venue === 'string' ? event.venue : undefined;
  const bannerUrl = event?.bannerImage?.url;

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const guestSession = getStoredGuestBookingSession();
      const headers: Record<string, string> = {};
      if (guestSession?.token) {
        headers['x-guest-session'] = guestSession.token;
      }
      const response = await apiClient.get(`/public/bookings/${booking.bookingId}/download`, {
        responseType: 'blob',
        headers,
      });
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${booking.bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[Download PDF] Error:', err);
      router.push(`/dashboard?tab=tickets&ref=${encodeURIComponent(booking.bookingId)}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex flex-col justify-between h-full space-y-4 sm:space-y-5 text-white text-center ${isModal ? '' : 'container-mad max-w-lg px-4 pb-20 pt-4'}`}>
      <div className="space-y-4 sm:space-y-4.5">
        {/* Success Badge */}
        <div className="flex flex-col items-center space-y-2 pt-1">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
            <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Booking Confirmed!
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-sm leading-relaxed">
            Your reservation is confirmed and your tickets are ready in your account.
          </p>
        </div>

        {/* Main Order Card */}
        <div className="glass rounded-2xl border border-white/10 p-4 space-y-3.5 text-left">
          {/* Event Header with Banner Thumbnail */}
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            {bannerUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <ImageWrapper
                  src={bannerUrl}
                  alt={eventTitle}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-accent-purple text-lg font-bold">
                🎟️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-1">
                {eventTitle}
              </h3>
              {venueDisplay && (
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  {venueDisplay}
                </p>
              )}
            </div>
            {formattedDate && (
              <span className="inline-block px-2.5 py-1 bg-white/10 rounded-full text-[10px] sm:text-xs text-accent-cyan font-bold tracking-wider uppercase border border-white/10 shrink-0">
                {formattedDate}
              </span>
            )}
          </div>

          {/* Reference ID Pill */}
          <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm">
            <span className="text-text-muted font-medium">Reference Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-accent-purple tracking-wider text-xs sm:text-sm">
                {booking.bookingId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-text-muted hover:text-white transition-colors cursor-pointer text-xs p-1 rounded hover:bg-white/10 flex items-center gap-1"
                title="Copy reference code"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Ticket Breakdown */}
          {booking.tickets && booking.tickets.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              {booking.tickets.map((t, idx) => (
                <TicketSummaryItem
                  key={idx}
                  tierName={t.tierName || t.tier}
                  quantity={t.quantity}
                  price={t.subtotal}
                  currency={currency}
                />
              ))}
            </div>
          )}

          {/* Total Paid */}
          <div className="flex justify-between items-center text-xs sm:text-sm font-bold pt-3 border-t border-white/5">
            <span className="text-text-primary">Total Amount Paid</span>
            <span className="text-accent-cyan font-mono text-sm sm:text-base font-black">
              {formatMoney(booking.totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Account Security / Anytime Access Guidance */}
        <div className="p-3.5 sm:p-4 bg-accent-purple/10 border border-accent-purple/25 rounded-2xl text-left flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center shrink-0 text-accent-purple text-xs mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1 w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm font-semibold text-white truncate">Your Account Is Ready</p>
              {!user?.isEmailVerified && (
                <button
                  type="button"
                  onClick={() =>
                    openAuthModal({
                      returnTo: `/dashboard?tab=tickets&ref=${encodeURIComponent(booking.bookingId)}`,
                      initialEmail: booking.guestEmail,
                      readonlyEmail: true,
                      autoRequestOtp: true,
                    })
                  }
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-0.5 rounded-full border border-amber-500/40 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                >
                  <span>⚠️</span>
                  <span>Verify Email (OTP)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Your tickets are linked to <span className="text-white font-medium">{booking.guestEmail}</span>. You can log in anytime from any device using a 6-digit email OTP.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons: Primary View Tickets + Secondary Download PDF */}
      <div className="space-y-2.5 pt-2 w-full">
        <button
          type="button"
          onClick={onViewTickets}
          className="w-full min-h-[48px] py-3.5 btn-gradient text-white font-bold text-sm rounded-xl shadow-glow transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
        >
          <TicketIcon className="w-4 h-4" />
          <span>View Tickets</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full min-h-[44px] py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-text-secondary hover:text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
        </button>
      </div>
    </div>
  );
}
