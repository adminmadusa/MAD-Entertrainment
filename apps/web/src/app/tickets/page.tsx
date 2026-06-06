'use client';

import { BookingStatus, QUERY_KEYS } from '@mad/shared';
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
  publicRecoverBookingEmail,
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

function TicketStatusMessage({ status }: { status: string }) {
  const messages: Record<string, string> = {
    [BookingStatus.AWAITING_PAYMENT]: 'Complete payment to receive tickets.',
    [BookingStatus.FAILED]: 'Payment was unsuccessful. Create a new booking to try again.',
    [BookingStatus.EXPIRED]: 'Reservation expired before payment completed.',
    [BookingStatus.CANCELLED]: 'This booking was cancelled.',
    [BookingStatus.REFUNDED]: 'Payment has been refunded.',
    [BookingStatus.EXPIRING]: 'We are processing this booking. Please check back shortly.',
    [BookingStatus.PENDING]: 'This booking is pending. Please check back shortly.',
  };

  return (
    <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
      {messages[status] || 'This booking is not ready for ticket access yet.'}
    </div>
  );
}

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const targetRef = searchParams.get('ref');
  const pollCountRef = useRef(0);

  const { logout, isAuthenticated, isLoading: isAuthLoading, user, onboardingRequired } = useAuth();
  const guestSession = getStoredGuestBookingSession();
  const singleBookingSessionToken = isAuthenticated ? undefined : guestSession?.token;

  // Core Retrieval States
  const [bookingRefInput, setBookingRefInput] = useState(targetRef || '');
  const [queryRef, setQueryRef] = useState(targetRef || '');
  const [step, setStep] = useState<'email' | 'portal'>('email');
  const [showLoginForGuest, setShowLoginForGuest] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Recovery States
  type LookupMode = 'reference' | 'transaction';
  const [lookupMode, setLookupMode] = useState<LookupMode>('reference');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [recoveredEmail, setRecoveredEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryResult, setShowRecoveryResult] = useState(false);
  const [showSupportGuidance, setShowSupportGuidance] = useState(false);

  // Query Bookings (only enabled when authenticated)
  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.mine(),
    queryFn: publicGetMyBookings,
    enabled: isAuthenticated,
    retry: false,
  });

  const bookings = bookingsData?.bookings || [];

  useEffect(() => {
    if (isAuthenticated && !isBookingsLoading) {
      const justLoggedIn = sessionStorage.getItem('just_logged_in');
      if (justLoggedIn) {
        sessionStorage.removeItem('just_logged_in');
        setErrorMsg(''); // Clear any stale validation errors from pre-login state
        if (bookings.length > 0) {
          setInfoMsg(`We found ${bookings.length} booking${bookings.length === 1 ? '' : 's'} linked to your email and added them to your wallet!`);
          // Clear message after 6 seconds
          setTimeout(() => setInfoMsg(''), 6000);
        }
      }
    }
  }, [isAuthenticated, isBookingsLoading, bookings.length]);

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
    if (isAuthenticated && !isAuthLoading && !onboardingRequired) {
      setStep('portal');
    }
  }, [isAuthenticated, isAuthLoading, onboardingRequired]);

  // Query a single booking by reference for guest or authenticated recovery.
  const {
    data: singleBookingData,
    error: singleLookupError,
    isLoading: isSingleLookupLoading,
    isFetching: isSingleLookupFetching,
  } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.detail(queryRef),
    queryFn: () => publicGetBookingDetails(queryRef, singleBookingSessionToken),
    enabled: !!queryRef,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.booking?.status;
      const ticketsReady = data?.ticketsReady;
      if (pollCountRef.current >= 5) return false;
      // Poll while payment is processing
      if (status === BookingStatus.AWAITING_PAYMENT || status === BookingStatus.EXPIRING) {
        return 3000;
      }
      // Poll while booking is confirmed but tickets are still being generated
      if (status === BookingStatus.CONFIRMED && !ticketsReady) {
        return 3000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!isSingleLookupFetching && singleBookingData?.booking) {
      const status = singleBookingData.booking.status;
      const ticketsReady = singleBookingData.ticketsReady;
      if (
        status === BookingStatus.AWAITING_PAYMENT ||
        status === BookingStatus.EXPIRING ||
        (status === BookingStatus.CONFIRMED && !ticketsReady)
      ) {
        pollCountRef.current += 1;
      }
    }
  }, [isSingleLookupFetching, singleBookingData?.booking, singleBookingData?.ticketsReady]);


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
    setQueryRef('');
    setBookingRefInput('');
  };

  const handleSignOutAndVerifyEmail = () => {
    logout();
    setStep('email');
    setErrorMsg('');
    setInfoMsg('');
  };

  const handleSearchAnother = () => {
    setQueryRef('');
    setBookingRefInput('');
    setErrorMsg('');
    setInfoMsg('');
    setShowLoginForGuest(false);
    setLookupMode('reference');
    setTransactionIdInput('');
    setRecoveredEmail('');
    setShowRecoveryResult(false);
    setShowSupportGuidance(false);
  };

  const handleSwitchToRecovery = () => {
    setErrorMsg('');
    setInfoMsg('');
    setLookupMode('transaction');
    setTransactionIdInput('');
    setRecoveredEmail('');
    setShowRecoveryResult(false);
    setShowSupportGuidance(false);
  };

  const handleSwitchToReference = () => {
    setErrorMsg('');
    setInfoMsg('');
    setLookupMode('reference');
    setTransactionIdInput('');
    setRecoveredEmail('');
    setShowRecoveryResult(false);
    setShowSupportGuidance(false);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const txId = transactionIdInput.trim();
    if (!txId) {
      setErrorMsg('Transaction ID is required.');
      return;
    }

    if (txId.length < 4) {
      setErrorMsg('Transaction ID must be at least 4 characters.');
      return;
    }

    setIsRecovering(true);
    try {
      const result = await publicRecoverBookingEmail(txId);
      setRecoveredEmail(result.email);
      setShowRecoveryResult(true);
    } catch (err) {
      const apiErr = extractApiError(err);
      const isAxiosError = err && typeof err === 'object' && 'response' in err;
      const status = isAxiosError ? (err as { response?: { status?: number } }).response?.status : undefined;
      if (status === 429) {
        setErrorMsg('Too many recovery attempts. Please wait before trying again.');
      } else if (status === 404) {
        setErrorMsg('Recovery information not found. Verify the transaction ID and try again.');
      } else {
        setErrorMsg(apiErr.message || 'Unable to complete recovery right now. Please try again later.');
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const handleContinueToSignIn = () => {
    if (isAuthenticated) {
      logout();
    }
    setQueryRef('');
    setBookingRefInput('');
    setShowLoginForGuest(true);
    setLookupMode('reference');
    setShowRecoveryResult(false);
    setTransactionIdInput('');
  };



  const tickets = bookingsData?.tickets || [];
  const singleBooking = singleBookingData?.booking;
  const singleTickets = singleBookingData?.tickets || [];
  const singleLookupApiError = singleLookupError ? extractApiError(singleLookupError) : null;
  const isOwnershipVerificationRequired = singleLookupApiError?.code === 'BOOKING_VERIFICATION_REQUIRED';
  const isOwnershipMismatch = isAuthenticated && isOwnershipVerificationRequired;
  const shouldShowPortal = (step === 'portal' || !!singleBooking) && !showLoginForGuest;
  const shouldShowAuthForm = (!shouldShowPortal && !isSingleLookupLoading) || showLoginForGuest;
  const shouldShowReferenceForm = !singleBooking;

  const renderReferenceFormContent = () => {
    if (showSupportGuidance) {
      return (
        <div className="glass rounded-3xl border border-border-subtle p-8 space-y-6 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-white/5 text-text-secondary text-2xl flex items-center justify-center rounded-full mx-auto">
            ✉️
          </div>
          <div className="space-y-3">
            <h3 className="text-white font-bold text-lg">Contact Support</h3>
            <p className="text-text-secondary text-xs leading-relaxed max-w-sm mx-auto">
              Please reach out to our support team to verify ownership and update your account email. When contacting us, please provide:
            </p>
            <ul className="text-left text-xs text-text-muted space-y-2 bg-white/5 border border-white/5 rounded-2xl p-4 max-w-xs mx-auto list-disc pl-8">
              <li>Payment Transaction ID</li>
              <li>Event name</li>
              <li>Approximate purchase date</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/contact"
              className="w-full py-3 px-5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md text-center"
            >
              Go to Support Contact Form
            </Link>
            <button
              type="button"
              onClick={() => setShowSupportGuidance(false)}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              ← Go Back
            </button>
          </div>
        </div>
      );
    }

    if (showRecoveryResult) {
      return (
        <div className="glass rounded-3xl border border-border-subtle p-8 space-y-6 shadow-glow-purple text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-accent-purple/10 text-accent-purple-light text-2xl flex items-center justify-center rounded-full mx-auto">
            🔍
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold text-lg">Booking Found</h3>
            <p className="text-text-secondary text-xs">
              We found the booking registered to the following email address:
            </p>
            <p className="text-white font-mono font-bold text-sm bg-white/5 border border-white/10 rounded-xl py-3 px-4 break-all select-all select-text selection:bg-accent-purple/50">
              {recoveredEmail}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleContinueToSignIn}
              className="flex-grow py-3 px-5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Continue to Sign In
            </button>
            <button
              type="button"
              onClick={() => setShowSupportGuidance(true)}
              className="flex-grow py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs font-bold rounded-xl transition-all text-center"
            >
              I no longer have access to this email
            </button>
          </div>
        </div>
      );
    }

    if (lookupMode === 'reference') {
      return (
        <>
          <h3 className="text-white font-bold text-sm px-2 text-center">Need help finding your ticket?</h3>
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl border border-border-subtle p-6 flex flex-col gap-3">
            <div className="flex-grow space-y-1">
              <label htmlFor="booking-ref-input" className="text-[10px] text-text-secondary font-medium tracking-wider uppercase">Search using your Booking Reference ID</label>
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
              className="w-full h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-transform"
            >
              {isSingleLookupLoading ? 'Searching...' : 'Lookup'}
            </button>
          </form>
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleSwitchToRecovery}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              Forgot your booking reference? Recover using your Payment Transaction ID
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="text-white font-bold text-sm px-2 text-center">Recover Booking Registered Email</h3>
        <form onSubmit={handleRecoverySubmit} className="glass rounded-2xl border border-border-subtle p-6 flex flex-col gap-3 animate-in fade-in duration-300">
          <div className="flex-grow space-y-1">
            <label htmlFor="transaction-id-input" className="text-[10px] text-text-secondary font-medium tracking-wider uppercase">Payment Transaction ID</label>
            <input
              id="transaction-id-input"
              type="text"
              value={transactionIdInput}
              onChange={(e) => setTransactionIdInput(e.target.value)}
              placeholder="e.g. pay_xxxxxxxxxx or pi_xxxxxxxxx"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-base lg:text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono tracking-wider transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isRecovering}
            className="w-full h-11 px-6 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-transform"
          >
            {isRecovering ? 'Finding...' : 'Find Booking Email'}
          </button>
        </form>
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleSwitchToReference}
            className="text-xs text-text-muted hover:text-white transition-colors"
          >
            ← Back to Booking Reference Search
          </button>
        </div>
      </>
    );
  };

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
            {shouldShowPortal ? 'My Ticket Wallet' : 'My Tickets'}
          </h1>
          {!shouldShowPortal && (
            <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
              {queryRef
                ? `Verify the email address used to book ${queryRef} to view your tickets.`
                : 'View, download, or resend your tickets.'}
            </p>
          )}
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

        {isOwnershipMismatch && user && (
          <div 
            role="alert"
            aria-live="polite"
            className="glass rounded-3xl border border-error/30 bg-error/5 p-6 space-y-4 text-center animate-in fade-in zoom-in duration-300"
          >
            <h3 className="text-red-400 font-bold text-base">
              We found this booking, but it belongs to a different account.
            </h3>
            <p className="text-text-secondary text-xs">
              You are currently signed in as: <span className="text-white font-semibold">{user.email}</span>
            </p>
            <p className="text-text-muted text-xs">
              To access these tickets, sign out and verify using the email address used during purchase.
            </p>
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleSignOutAndVerifyEmail}
                className="px-6 py-2.5 bg-error hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Sign Out & Verify Email
              </button>
            </div>
          </div>
        )}



        {/* SCREEN 1 & 2: Reusable Shared AuthForm Gate */}
        {shouldShowAuthForm && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {!showLoginForGuest && !queryRef && (
              <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-5 text-center shadow-glow-sm">
                <p className="text-text-secondary text-xs leading-relaxed">
                  Sign in using the email used during booking.
                </p>
                <p className="text-text-muted text-[10px] mt-2 leading-relaxed">
                  A 6-digit OTP will be sent to your email.
                </p>
              </div>
            )}
            
            <div className="glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl">
              <AuthForm 
                mode="wallet" 
                isVerificationRequired={isOwnershipVerificationRequired}
                bookingReference={queryRef}
                initialEmail={recoveredEmail || undefined}
                onSuccess={() => { 
                  sessionStorage.setItem('just_logged_in', 'true');
                  setStep('portal'); 
                  setShowLoginForGuest(false); 
                  setErrorMsg('');
                  setRecoveredEmail('');
                }} 
              />
              {showLoginForGuest && (
                <button 
                  onClick={() => setShowLoginForGuest(false)} 
                  className="mt-6 w-full text-xs text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <span>←</span> Cancel and return to ticket
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 3: Consolidated Bookings Portal Dashboard */}
        {shouldShowPortal && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {(!singleBooking || isAuthenticated) && (
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleExitPortal}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-lg text-text-primary transition-all"
                >
                  Log Out
                </button>
              </div>
            )}

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

                    {singleBooking.status === BookingStatus.AWAITING_PAYMENT && (
                      <PaymentRecoveryBanner booking={singleBooking} />
                    )}

                    {singleBooking.status === BookingStatus.CONFIRMED ? (
                      (() => {
                        const ticketsReady = singleBookingData?.ticketsReady;
                        const pollsExhausted = pollCountRef.current >= 5;

                        if (!ticketsReady) {
                          return (
                            <div className="space-y-3 pt-4 border-t border-border-subtle/30">
                              <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                              {pollsExhausted ? (
                                <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center text-text-secondary text-sm">
                                  Your tickets are being processed and will appear in your email shortly.
                                </div>
                              ) : (
                                <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center space-y-3">
                                  <div className="flex items-center justify-center gap-2 text-accent-purple-light text-sm font-semibold">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Generating your tickets...
                                  </div>
                                  <p className="text-text-muted text-xs">This usually takes a few seconds. Your entry passes will appear here automatically.</p>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
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

                            {!isAuthenticated && (
                              <div className="space-y-4 mt-8 pt-6 border-t border-border-subtle/30">
                                <p className="text-text-muted text-xs leading-relaxed text-center">
                                  Your ticket has been sent to <span className="text-white font-semibold">{singleBooking.guestEmail}</span>. You can view it anytime by signing in with the same email address.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                  <button
                                    type="button"
                                    onClick={() => setShowLoginForGuest(true)}
                                    className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md"
                                  >
                                    Sign In to Wallet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSearchAnother}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-xs font-bold rounded-xl transition-all border border-white/10"
                                  >
                                    Search Another Booking
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <TicketStatusMessage status={singleBooking.status} />
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
                          {booking.status === BookingStatus.CONFIRMED ? (
                            (() => {
                              const bookingTicketsReady =
                                bookingsData?.ticketsReadyMap?.[booking._id?.toString() ?? ''] ?? false;

                              if (!bookingTicketsReady) {
                                return (
                                  <div className="space-y-3 pt-4 border-t border-border-subtle/30">
                                    <h3 className="text-white font-bold text-sm">Entry Passes</h3>
                                    <div className="glass-strong rounded-2xl border border-border-subtle p-6 text-center space-y-3">
                                      <div className="flex items-center justify-center gap-2 text-accent-purple-light text-sm font-semibold">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Generating your tickets...
                                      </div>
                                      <p className="text-text-muted text-xs">Your entry passes will appear here shortly.</p>
                                    </div>
                                  </div>
                                );
                              }

                              return (
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
                              );
                            })()
                          ) : (
                            <TicketStatusMessage status={booking.status} />
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
                  <h3 className="text-white font-bold text-base">No tickets found</h3>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                    Tickets purchased using this email address will appear here automatically.
                  </p>
                  <div className="flex justify-center pt-4">
                    <Link href="/events" className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md">
                      Browse Events
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {shouldShowReferenceForm && (
          <div className="space-y-4 pt-4 mt-8 max-w-md mx-auto">
            {renderReferenceFormContent()}

            {queryRef && singleLookupApiError && !isOwnershipVerificationRequired && !singleBooking && (
              <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
                {singleLookupApiError.message || `We couldn't retrieve booking ${queryRef}.`}
              </div>
            )}

            {queryRef && isSingleLookupLoading && (
              <div className="glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl text-center text-text-muted text-xs animate-pulse">
                Checking secure access for {queryRef}...
              </div>
            )}
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
