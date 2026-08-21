'use client';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

  const handleCopy = () => {
    if (booking?.bookingId) {
      navigator.clipboard.writeText(booking.bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!booking?.bookingId) return;
    try {
      setDownloading(true);
      const sessionToken = getStoredGuestBookingSession()?.token;
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }
      const { data } = await apiClient.post<{ data: { downloadToken: string } }>(
        `/bookings/${booking.bookingId}/download-token`,
        {},
        { headers }
      );
      const token = data?.data?.downloadToken;
      if (token) {
        const downloadUrl = `${apiClient.defaults.baseURL || ''}/bookings/${booking.bookingId}/download?token=${token}`;
        window.open(downloadUrl, '_blank');
      }
    } catch (_err) {
      router.push(`/dashboard?tab=tickets&ref=${encodeURIComponent(booking.bookingId)}`);
    } finally {
      setDownloading(false);
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
        {/* Header checkmark & title */}
        <div className="flex items-center justify-center gap-3 text-emerald-400">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-glow-sm">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-lg sm:text-xl font-bold tracking-wide text-white">Booking Confirmed!</h2>
            <p className="text-xs text-text-muted">
              Tickets sent to <span className="text-white font-medium">{booking.guestEmail || 'your email'}</span>
            </p>
          </div>
        </div>

        {/* Event Card with Banner */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden backdrop-blur-md">
          {event?.bannerImage?.url && (
            <div className="relative h-24 sm:h-28 w-full rounded-xl overflow-hidden mb-2">
              <ImageWrapper
                src={event.bannerImage.url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            </div>
          )}

          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                {event?.title || 'Event Booking'}
              </h3>
              {venueDisplay && (
                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                  <span>📍</span>
                  <span>{venueDisplay}</span>
                </p>
              )}
            </div>
            {formattedDate && (
              <span className="inline-block px-2.5 py-1 bg-white/10 rounded-full text-[10px] text-accent-cyan font-bold tracking-wider uppercase border border-white/10 shrink-0">
                {formattedDate}
              </span>
            )}
          </div>

          {/* Reference ID Pill */}
          <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs">
            <span className="text-text-muted font-medium">Reference Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-accent-purple tracking-wider">
                {booking.bookingId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-text-muted hover:text-white transition-colors cursor-pointer text-xs p-1 rounded hover:bg-white/10"
                title="Copy reference code"
              >
                {copied ? '✓' : '📋'}
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
          <div className="flex justify-between items-center text-xs font-bold pt-2.5 border-t border-white/5">
            <span className="text-text-primary">Total Amount Paid</span>
            <span className="text-accent-cyan font-mono text-sm font-black">
              {formatMoney(booking.totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Account Security / Anytime Access Guidance */}
        <div className="p-3.5 bg-accent-purple/10 border border-accent-purple/25 rounded-2xl text-left flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center shrink-0 text-accent-purple text-xs mt-0.5">
            🔐
          </div>
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">Your Account Is Ready</p>
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
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-0.5 rounded-full border border-amber-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <span>⚠️</span>
                  <span>Verify Email (OTP)</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Your tickets are linked to <span className="text-white font-medium">{booking.guestEmail}</span>. You can log in anytime from any device using a 6-digit email OTP.
            </p>
          </div>
        </div>

        {/* Action Buttons: Primary View Tickets + Secondary Download PDF */}
        <div className="space-y-2.5 pt-1 w-full">
          <button
            type="button"
            onClick={onViewTickets}
            className="w-full py-3.5 btn-gradient text-white font-bold text-sm rounded-xl shadow-glow transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
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
            <span>View Tickets</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-text-secondary hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

