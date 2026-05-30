'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';

import { useCountdown } from '@/hooks/use-countdown.hook';

import { extractApiError } from '@/lib/api/client';
import { publicGetBookingDetails, publicDownloadTicketPDF, publicResendTicketEmail } from '@/lib/api/public.service';
import { STORAGE_VERSION } from '@mad/shared';
import { BookingHeaderCard } from '@/components/booking/shared/BookingHeaderCard';
import { TicketActions } from '@/components/booking/shared/TicketActions';
import { EntryPassGrid } from '@/components/booking/shared/EntryPassGrid';

function PaymentRecoveryBanner({ booking }: { booking: { logicalExpiresAt?: string | Date; expiresAt?: string | Date; bookingId: string } }) {
  const countdown = useCountdown(booking?.logicalExpiresAt || booking?.expiresAt);
  const isExpired = countdown.isExpired;
  
  if (isExpired) return null;

  return (
    <div className="glass rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-center sm:text-left">
        <h3 className="text-amber-400 font-bold text-base flex items-center gap-2 justify-center sm:justify-start">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Complete Your Payment
        </h3>
        <p className="text-text-secondary text-xs max-w-md">
          Your seats are temporarily reserved. Complete your payment to confirm this booking. Reservation expires in <span className="font-mono font-bold text-amber-300">{countdown.minutes}:{String(countdown.seconds).padStart(2, '0')}</span>.
        </p>
      </div>
      <div className="flex flex-col w-full sm:w-auto gap-3 shrink-0">
        <Link href={`/checkout/${booking.bookingId}`} className="px-6 py-2.5 rounded-xl btn-gradient text-white font-bold text-sm shadow-glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
          Complete Payment
        </Link>
        <a href="mailto:support@mad-entertainment.com" className="px-6 py-2.5 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
          Contact Support
        </a>
      </div>
    </div>
  );
}

function MyBookingContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';
  const pollCountRef = useRef(0);

  const [bookingRefInput, setBookingRefInput] = useState(initialRef);
  const [queryRef, setQueryRef] = useState(initialRef);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendState, setResendState] = useState<'idle' | 'loading' | 'success' | 'cooldown' | 'error'>('idle');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleDownloadPDF = async () => {
    if (!booking) return;
    if (downloadState === 'loading') return;
    setDownloadState('loading');
    setErrorMsg('');

    try {
      const blob = await publicDownloadTicketPDF(booking.bookingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAD_Ticket_${booking.bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setDownloadState('success');
      setTimeout(() => setDownloadState('idle'), 2500);
    } catch (err) {
      setDownloadState('error');
      setErrorMsg('Failed to download PDF ticket. Please try again.');
      setTimeout(() => setDownloadState('idle'), 5000);
    }
  };

  const handleResendEmail = async () => {
    if (!booking) return;
    if (resendState === 'loading' || resendState === 'cooldown') return;
    setResendState('loading');
    setErrorMsg('');

    try {
      const response = await publicResendTicketEmail(booking.bookingId);
      if (response.success) {
        setResendState('success');
        setTimeout(() => {
          setResendState('cooldown');
          setCooldownSeconds(60);
        }, 3000);
      } else {
        throw new Error(response.message || 'Failed to resend email');
      }
    } catch (err: unknown) {
      setResendState('error');
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend ticket email. Please try again.');
      setTimeout(() => setResendState('idle'), 5000);
    }
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (resendState === 'cooldown') {
        setResendState('idle');
      }
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds, resendState]);


  const { data: result, isLoading, isFetching, error } = useQuery({
    queryKey: ['public-booking-details', queryRef],
    queryFn: () => {
      let sess: string | undefined;
      if (typeof window !== 'undefined') {
        const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
        sess = sessionStorage.getItem(sessionKey) || undefined;
      }
      return publicGetBookingDetails(queryRef, sess);
    },
    enabled: !!queryRef,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.booking?.status;
      if (pollCountRef.current >= 5) return false;
      if (status === 'awaiting_payment' || status === 'expiring') {
        return 3000;
      }
      return false;
    }
  });

  useEffect(() => {
    if (!isFetching && result?.booking) {
      const status = result.booking.status;
      if (status === 'awaiting_payment' || status === 'expiring') {
        pollCountRef.current += 1;
      }
    }
  }, [isFetching, result?.booking]);

  const [isAuthRequired, setIsAuthRequired] = useState(false);

  useEffect(() => {
    if (error) {
      const apiErr = extractApiError(error);
      if (apiErr.code === 'BOOKING_VERIFICATION_REQUIRED') {
        setIsAuthRequired(true);
        setErrorMsg('');
      } else {
        setIsAuthRequired(false);
        setErrorMsg(apiErr.message);
      }
    } else {
      setErrorMsg('');
      setIsAuthRequired(false);
    }
  }, [error]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsAuthRequired(false);
    pollCountRef.current = 0;
    if (!bookingRefInput.trim()) {
      setErrorMsg('Please enter a booking reference ID.');
      return;
    }
    setQueryRef(bookingRefInput.trim());
  };

  const booking = result?.booking;
  const tickets = result?.tickets || [];

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white">Track Booking</h1>
          <p className="text-text-secondary text-sm">
            Retrieve your tickets and view active booking status reports.
          </p>
        </div>

        {/* Search Reference Form */}
        <form onSubmit={handleSearchSubmit} className="glass rounded-2xl border border-border-subtle p-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-grow space-y-1">
            <label className="text-[10px] text-text-secondary font-medium tracking-wider uppercase">Booking Reference ID</label>
            <input
              type="text"
              value={bookingRefInput}
              onChange={(e) => setBookingRefInput(e.target.value)}
              placeholder="e.g. MAD-2026-ABCDE"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono uppercase tracking-wider transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="sm:self-end h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-transform"
          >
            {isLoading ? 'Searching...' : 'Retrieve Tickets'}
          </button>
        </form>

        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {isAuthRequired && (
          <div className="glass rounded-2xl border border-accent-purple/30 p-8 text-center space-y-4 shadow-glow-sm">
            <div className="text-3xl">🔒</div>
            <h3 className="text-white font-bold text-lg">Verification Required</h3>
            <p className="text-text-secondary text-sm max-w-sm mx-auto">
              For security, viewing the booking <span className="font-mono text-white font-bold select-all">{queryRef}</span> on a new device requires a quick email verification.
            </p>
            <Link
              href={`/tickets?ref=${queryRef}`}
              className="inline-flex mt-4 px-6 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Verify Email to View Ticket
            </Link>
          </div>
        )}

        {/* Booking Details Display */}
        {isLoading && (
          <div className="text-center py-16 text-text-muted text-xs animate-pulse">
            Fetching booking details and tickets...
          </div>
        )}
        
        {!isLoading && booking && (
          <div className="space-y-6">
            {/* Summary Details */}
            <div className="glass rounded-3xl border border-border-subtle p-6 space-y-4">
              <BookingHeaderCard booking={booking} isFetching={isFetching && !isLoading} pollCount={pollCountRef.current} />

              {booking.status === 'confirmed' && (
                <div className="pt-4 border-t border-border-subtle/40 flex flex-col sm:flex-row gap-3">
                  <TicketActions
                    downloading={downloadState === 'loading'}
                    resending={resendState === 'loading'}
                    cooldown={resendState === 'cooldown' ? cooldownSeconds : undefined}
                    onDownload={handleDownloadPDF}
                    onResend={handleResendEmail}
                  />
                </div>
              )}
            </div>

            {/* Payment Recovery Banner */}
            {booking.status === 'awaiting_payment' && (
              <PaymentRecoveryBanner booking={booking} />
            )}

            {/* Tickets / QR List */}
            {booking.status === 'confirmed' ? (
              <div className="space-y-6">
                <h3 className="text-white font-bold text-base">Your Tickets</h3>
                <EntryPassGrid tickets={tickets} />
              </div>
            ) : (
              <div className="glass rounded-2xl border border-border-subtle p-8 text-center text-text-secondary text-sm">
                🎁 Tickets will be generated automatically once payment is finalized.
              </div>
            )}
          </div>
        )}
        {!isLoading && !booking && queryRef && (
          <div className="text-center py-12 text-text-muted text-xs">
            No booking details resolved for reference &quot;{queryRef}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBookingPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-sm">Loading tickets details...</div>
      </div>
    }>
      <MyBookingContent />
    </Suspense>
  );
}
