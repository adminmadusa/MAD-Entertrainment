'use client';

import { QUERY_KEYS } from '@mad/shared';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, Suspense, useRef } from 'react';

import { useSearchParams } from 'next/navigation';

import { useCountdown } from '@/hooks/use-countdown.hook';
import { extractApiError } from '@/lib/api/client';
import {
  getStoredGuestBookingSession,
  publicGetBookingDetails,
  publicGetMyBookings,
  publicDownloadTicketPDF,
  publicResendTicketEmail,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';
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

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const targetRef = searchParams.get('ref');
  const pollCountRef = useRef(0);

  const { logout, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const guestSession = getStoredGuestBookingSession();
  const singleBookingSessionToken = isAuthenticated ? undefined : guestSession?.token;

  // Core Retrieval States
  const [bookingRefInput, setBookingRefInput] = useState(targetRef || '');
  const [queryRef, setQueryRef] = useState(targetRef || '');
  const [step, setStep] = useState<'email' | 'portal'>('email');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Resend / Download States
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [singleResendCooldownSeconds, setSingleResendCooldownSeconds] = useState(0);

  useEffect(() => {
    if (targetRef) {
      setBookingRefInput(targetRef);
      setQueryRef(targetRef);
      pollCountRef.current = 0;
    }
  }, [targetRef]);

  useEffect(() => {
    if (singleResendCooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setSingleResendCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [singleResendCooldownSeconds]);

  // Transition directly to portal if already authenticated on mount
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      setStep('portal');
    }
  }, [isAuthenticated, isAuthLoading]);

  // Query Bookings (only enabled when authenticated)
  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.mine(),
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });

  // Query a single booking by reference for guest or authenticated recovery.
  const {
    data: singleBookingData,
    error: singleLookupError,
    isLoading: isSingleLookupLoading,
    isFetching: isSingleLookupFetching,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.detail(queryRef),
    queryFn: () => publicGetBookingDetails(queryRef, singleBookingSessionToken),
    enabled: !!queryRef && (isAuthenticated || !!singleBookingSessionToken),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.booking?.status;
      if (pollCountRef.current >= 5) return false;
      if (status === 'awaiting_payment' || status === 'expiring') {
        return 3000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!isSingleLookupFetching && singleBookingData?.booking) {
      const status = singleBookingData.booking.status;
      if (status === 'awaiting_payment' || status === 'expiring') {
        pollCountRef.current += 1;
      }
    }
  }, [isSingleLookupFetching, singleBookingData?.booking]);


  // ─── Actions ────────────────────────────────────────────────

  const handleDownloadPDF = async (bookingId: string, sessionToken?: string) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setDownloadingId(bookingId);

      const blob = await publicDownloadTicketPDF(bookingId, sessionToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAD_Ticket_${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setInfoMsg('Ticket PDF downloaded successfully.');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to download ticket PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResendTickets = async (bookingId: string, sessionToken?: string, withCooldown = false) => {
    try {
      setErrorMsg('');
      setInfoMsg('');
      setResendingId(bookingId);

      const res = await publicResendTicketEmail(bookingId, sessionToken);
      setInfoMsg(res.message || 'Tickets resent successfully to your email.');
      if (withCooldown) {
        setSingleResendCooldownSeconds(60);
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend tickets. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    pollCountRef.current = 0;

    const normalizedRef = bookingRefInput.trim().toUpperCase();
    if (!normalizedRef) {
      setErrorMsg('Please enter a booking reference ID.');
      return;
    }

    setBookingRefInput(normalizedRef);
    setQueryRef(normalizedRef);
  };

  const handleExitPortal = () => {
    logout();
    setStep('email');
    setErrorMsg('');
    setInfoMsg('');
  };



  const bookings = bookingsData?.bookings || [];
  const tickets = bookingsData?.tickets || [];
  const singleBooking = singleBookingData?.booking;
  const singleTickets = singleBookingData?.tickets || [];
  const singleLookupApiError = singleLookupError ? extractApiError(singleLookupError) : null;
  const isOwnershipVerificationRequired = singleLookupApiError?.code === 'BOOKING_VERIFICATION_REQUIRED';
  const shouldShowPortal = step === 'portal' || !!singleBooking;
  const shouldShowAuthForm = !shouldShowPortal && !isSingleLookupLoading;
  const shouldShowReferenceForm = !singleBooking;

  const sortedBookings = [...bookings].sort((a, b) => {
    if (queryRef && a.bookingId === queryRef) return -1;
    if (queryRef && b.bookingId === queryRef) return 1;
    return 0;
  });

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            {shouldShowPortal ? 'My Ticket Wallet' : 'Retrieve Tickets'}
          </h1>
          <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
            {(() => {
              if (shouldShowPortal) {
                if (singleBooking) {
                  return `Booking ${singleBooking.bookingId} is available for this session.`;
                }
                return `Manage and view entry passes associated with ${user?.email || 'your email'}.`;
              }
              if (queryRef) {
                return `Verify the email address used to book ${queryRef} to view your tickets.`;
              }
              return 'Enter your email address to verify your identity and instantly track your active event bookings.';
            })()}
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in zoom-in duration-300">
            {infoMsg}
          </div>
        )}

        {shouldShowReferenceForm && (
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl border border-border-subtle p-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-grow space-y-1">
              <label htmlFor="booking-ref-input" className="text-[10px] text-text-secondary font-medium tracking-wider uppercase">Booking Reference ID</label>
              <input
                id="booking-ref-input"
                type="text"
                value={bookingRefInput}
                onChange={(e) => setBookingRefInput(e.target.value)}
                placeholder="e.g. MAD-2026-ABCDE"
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-base lg:text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono uppercase tracking-wider transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSingleLookupLoading}
              className="sm:self-end h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-transform"
            >
              {isSingleLookupLoading ? 'Searching...' : 'Open Wallet'}
            </button>
          </form>
        )}

        {queryRef && singleLookupApiError && !isOwnershipVerificationRequired && !singleBooking && (
          <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
            {singleLookupApiError.message || `We couldn't retrieve booking ${queryRef}.`}
          </div>
        )}

        {queryRef && isSingleLookupLoading && (
          <div className="max-w-md mx-auto glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl text-center text-text-muted text-xs animate-pulse">
            Checking secure access for {queryRef}...
          </div>
        )}

        {/* SCREEN 1 & 2: Reusable Shared AuthForm Gate */}
        {shouldShowAuthForm && (
          <div className="max-w-md mx-auto glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
            <AuthForm mode="wallet" onSuccess={() => setStep('portal')} />
          </div>
        )}

        {/* SCREEN 3: Consolidated Bookings Portal Dashboard */}
        {shouldShowPortal && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            
            {/* Header Control */}
            <div className="flex justify-between items-center bg-white/5 border border-border-subtle/50 px-6 py-4 rounded-2xl">
              <div className="text-left">
                <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Active Session</span>
                <p className="text-white text-xs font-semibold">{singleBooking && !isAuthenticated ? 'Guest booking session' : user?.email}</p>
              </div>
              {(!singleBooking || isAuthenticated) && (
                <button
                  type="button"
                  onClick={handleExitPortal}
                  className="text-xs px-4 py-2 bg-white/10 hover:bg-white/15 border border-border-subtle rounded-xl text-text-primary font-semibold transition-all"
                >
                  Log Out
                </button>
              )}
            </div>

            {(() => {
              if (singleBooking) {
                const containerClasses = "glass rounded-3xl p-6 sm:p-8 space-y-6 shadow-glow-purple transition-all duration-300 border-accent-purple ring-2 ring-accent-purple/50";

                return (
                  <div className={containerClasses}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-accent-purple-light font-bold uppercase tracking-wider">
                        Retrieved Booking
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">{singleBooking.bookingId}</span>
                    </div>

                    <BookingHeaderCard booking={singleBooking} isFetching={isSingleLookupFetching && !isSingleLookupLoading} pollCount={pollCountRef.current} />

                    {singleBooking.status === 'awaiting_payment' && (
                      <PaymentRecoveryBanner booking={singleBooking} />
                    )}

                    {singleBooking.status === 'confirmed' ? (
                      <div className="space-y-4 pt-4 border-t border-border-subtle/30">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                          <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                          <TicketActions
                            downloading={downloadingId === singleBooking.bookingId}
                            resending={resendingId === singleBooking.bookingId}
                            cooldown={singleResendCooldownSeconds}
                            onDownload={() => handleDownloadPDF(singleBooking.bookingId, singleBookingSessionToken)}
                            onResend={() => handleResendTickets(singleBooking.bookingId, singleBookingSessionToken, true)}
                          />
                        </div>
                        <EntryPassGrid tickets={singleTickets} />
                      </div>
                    ) : (
                      <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                        🎁 Entry tickets and QR scanner codes will be generated automatically once your payment is successfully completed.
                      </div>
                    )}
                  </div>
                );
              }

              if (isBookingsLoading) {
                return (
                  <div className="text-center py-20 text-text-muted text-xs animate-pulse">
                    Loading secure ticket resources...
                  </div>
                );
              }

              if (sortedBookings.length > 0) {
                return (
                  <div className="space-y-8">
                    {sortedBookings.map((booking) => {
                      const bookingTickets = tickets.filter(
                        (t) => t.bookingId === booking._id || t.bookingId?.toString() === booking._id?.toString()
                      );

                      const isTarget = queryRef && booking.bookingId === queryRef;
                      const containerClasses = isTarget
                        ? "glass rounded-3xl p-6 sm:p-8 space-y-6 shadow-glow-purple transition-all duration-300 border-accent-purple ring-2 ring-accent-purple/50"
                        : "glass rounded-3xl border border-border-subtle p-6 sm:p-8 space-y-6 shadow-xl transition-all duration-300 hover:border-white/10";

                      return (
                        <div
                          key={booking._id}
                          className={containerClasses}
                        >
                          <BookingHeaderCard booking={booking} />

                          {/* Tickets list for confirmed bookings */}
                          {booking.status === 'confirmed' ? (
                            <div className="space-y-4 pt-4 border-t border-border-subtle/30">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                                <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                                <TicketActions
                                  downloading={downloadingId === booking.bookingId}
                                  resending={resendingId === booking.bookingId}
                                  onDownload={() => handleDownloadPDF(booking.bookingId)}
                                  onResend={() => handleResendTickets(booking.bookingId)}
                                />
                              </div>
                              <EntryPassGrid tickets={bookingTickets} />
                            </div>
                          ) : (
                            <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                              🎁 Entry tickets and QR scanner codes will be generated automatically once your payment is successfully completed.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div className="glass rounded-3xl border border-border-subtle p-16 text-center space-y-4">
                  <div className="text-4xl">🎫</div>
                  <h3 className="text-white font-bold text-base">No Tickets Found</h3>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                    {queryRef ? (
                      <>
                        We couldn't find the booking <span className="text-white font-semibold">{queryRef}</span> associated with <span className="text-white font-semibold">{user?.email}</span>. Did you use a different email address at checkout?
                      </>
                    ) : (
                      <>
                        We couldn't find any confirmed event bookings associated with the email <span className="text-white font-semibold">{user?.email}</span>.
                      </>
                    )}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleExitPortal}
                      className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      Try Another Email
                    </button>
                    <a
                      href="mailto:support@mad-entertainment.com"
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-border-subtle"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TicketRetrievalPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-16 min-h-screen bg-background flex items-center justify-center">
        <div className="text-purple-300 animate-pulse text-sm">Loading Ticket Wallet...</div>
      </div>
    }>
      <TicketRetrievalContent />
    </Suspense>
  );
}
