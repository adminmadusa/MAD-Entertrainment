'use client';

import { BookingStatus, QUERY_KEYS } from '@mad/shared';
import type { Booking, Event } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { Modal } from '@mad/ui';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { useCountdown } from '@/hooks/use-countdown.hook';
import { extractApiError } from '@/lib/api/client';
import {
  getStoredGuestBookingSession,
  publicGetBookingDetails,
  publicRecoverBookingEmail,
  publicVerifyRecoveredBookingOTP,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';
import { useBookings } from '@/hooks/use-bookings.hook';
import { BookingCard } from '@/components/booking/shared/BookingCard';

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetRef = searchParams.get('ref');
  const pollCountRef = useRef(0);

  const { login, setOnboardingRequired, logout, isAuthenticated, isLoading: isAuthLoading, user, onboardingRequired } = useAuth();
  const guestSession = getStoredGuestBookingSession();
  const singleBookingSessionToken = isAuthenticated ? undefined : guestSession?.token;

  // Core Retrieval States
  const [bookingRefInput, setBookingRefInput] = useState(targetRef || '');
  const [queryRef, setQueryRef] = useState(targetRef || '');
  const [step, setStep] = useState<'email' | 'portal'>('email');
  const [showLoginForGuest, setShowLoginForGuest] = useState(false);
  const [isAuthModalDismissed, setIsAuthModalDismissed] = useState(false);

  // Recovery States
  type LookupMode = 'reference' | 'transaction';
  const [lookupMode, setLookupMode] = useState<LookupMode>('reference');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [recoveredEmail, setRecoveredEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [showRecoveryResult, setShowRecoveryResult] = useState(false);
  const [showSupportGuidance, setShowSupportGuidance] = useState(false);

  // OTP Verification States
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);

  useEffect(() => {
    if (recoveryCooldown <= 0) return;
    const timer = setInterval(() => {
      setRecoveryCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [recoveryCooldown]);

  // Use the SSOT bookings query and handlers
  const {
    bookings,
    tickets,
    ticketsReadyMap,
    isLoading: isBookingsLoading,
    downloadingId,
    resendingId,
    resendCooldowns,
    errorMsg,
    infoMsg,
    setErrorMsg,
    setInfoMsg,
    handleDownloadPDF,
    handleResendTickets,
  } = useBookings();

  useEffect(() => {
    if (showLoginForGuest) {
      setIsAuthModalDismissed(false);
    }
  }, [showLoginForGuest]);

  useEffect(() => {
    if (targetRef) {
      setBookingRefInput(targetRef);
      setQueryRef(targetRef);
      pollCountRef.current = 0;
    }
  }, [targetRef]);

  // Redirect to dashboard if already authenticated on mount
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      if (onboardingRequired) {
        const dest = targetRef 
          ? `/dashboard?ref=${encodeURIComponent(targetRef.trim())}`
          : '/dashboard';
        router.replace(dest);
      } else {
        const dest = targetRef 
          ? `/dashboard?tab=tickets&ref=${encodeURIComponent(targetRef.trim())}`
          : '/dashboard?tab=tickets';
        router.replace(dest);
      }
    }
  }, [isAuthenticated, isAuthLoading, onboardingRequired, targetRef, router]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    pollCountRef.current = 0;
    setIsAuthModalDismissed(false);

    const normalizedRef = bookingRefInput.trim().toUpperCase();
    if (!normalizedRef) {
      setErrorMsg('Please enter a booking reference ID.');
      return;
    }
    setBookingRefInput(normalizedRef);
    setQueryRef(normalizedRef);
  };

  const handleSignOutAndVerifyEmail = () => {
    logout();
    setStep('email');
    setErrorMsg('');
    setInfoMsg('');
    setIsAuthModalDismissed(false);
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
    setIsAuthModalDismissed(false);
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
      setRecoveredEmail(result.maskedEmail);
      setRecoveryCooldown(result.cooldownSeconds || 60);
      setOtpInput('');
      setShowRecoveryResult(true);
      if (result.otpDispatched) {
        setInfoMsg('Verification code sent to your email.');
      } else {
        setInfoMsg('A verification code was recently sent. Please wait before resending.');
      }
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const otp = otpInput.trim().replace(/\s/g, '');
    if (!otp) {
      setErrorMsg('Verification code is required.');
      return;
    }
    if (otp.length !== 6) {
      setErrorMsg('Verification code must be 6 digits.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const result = await publicVerifyRecoveredBookingOTP(transactionIdInput.trim(), otp);
      login(result.token, result.user);
      setOnboardingRequired(!!result.onboardingRequired);
      setInfoMsg('Successfully authenticated! Loading your tickets...');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendRecoveryOtp = async () => {
    if (recoveryCooldown > 0) return;
    setErrorMsg('');
    setInfoMsg('');
    setIsRecovering(true);
    try {
      const result = await publicRecoverBookingEmail(transactionIdInput.trim());
      setRecoveryCooldown(result.cooldownSeconds || 60);
      setOtpInput('');
      if (result.otpDispatched) {
        setInfoMsg('A new verification code has been sent to your email.');
      } else {
        setInfoMsg('A verification code was recently sent. Please wait.');
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend verification code.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleChangeTransactionId = () => {
    setErrorMsg('');
    setInfoMsg('');
    setShowRecoveryResult(false);
    setOtpInput('');
    setRecoveryCooldown(0);
  };

  const singleBooking = singleBookingData?.booking;
  const singleTickets = singleBookingData?.tickets || [];
  const singleLookupApiError = singleLookupError ? extractApiError(singleLookupError) : null;
  const isOwnershipVerificationRequired = singleLookupApiError?.code === 'BOOKING_VERIFICATION_REQUIRED';
  const isOwnershipMismatch = isAuthenticated && isOwnershipVerificationRequired;
  const shouldShowPortal = (step === 'portal' || !!singleBooking) && !showLoginForGuest;
  const shouldShowAuthForm =
    ((!shouldShowPortal && !isSingleLookupLoading) && !isAuthModalDismissed) ||
    showLoginForGuest;
  const shouldShowReferenceForm = !singleBooking && !isAuthenticated;

  // Sorting and filtering logic for authenticated view
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (queryRef && a.bookingId === queryRef) return -1;
      if (queryRef && b.bookingId === queryRef) return 1;
      return 0;
    });
  }, [bookings, queryRef]);

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return sortedBookings.filter((booking) => {
      const eventInfo = booking.eventId as unknown as Partial<Event>;
      const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
      const isConfirmed = booking.status === BookingStatus.CONFIRMED;
      if (!isConfirmed) return false;
      if (!startDate) return true;
      return startDate >= now;
    });
  }, [sortedBookings]);

  const pastBookings = useMemo(() => {
    const now = new Date();
    return sortedBookings.filter((booking) => {
      const eventInfo = booking.eventId as unknown as Partial<Event>;
      const startDate = eventInfo?.startDate ? new Date(eventInfo.startDate) : null;
      const isConfirmed = booking.status === BookingStatus.CONFIRMED;
      if (!isConfirmed) return true;
      if (!startDate) return false;
      return startDate < now;
    });
  }, [sortedBookings]);

  const renderReferenceFormContent = () => {
    if (showSupportGuidance) {
      return (
        <div className="glass rounded-3xl border border-border-subtle p-4 sm:p-8 space-y-4 sm:space-y-6 text-center animate-in fade-in duration-300">
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
        <div className="glass rounded-3xl border border-border-subtle p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-glow-purple text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-accent-purple/10 text-accent-purple-light text-2xl flex items-center justify-center rounded-full mx-auto">
            ✉️
          </div>
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
            <div className="space-y-2">
              <h3 className="text-white font-bold text-lg">Verification Required</h3>
              <p className="text-text-secondary text-xs">
                Verification code sent to:
              </p>
              <p className="text-white font-mono font-bold text-sm bg-white/5 border border-white/10 rounded-xl py-3 px-4 break-all select-all select-text selection:bg-accent-purple/50">
                {recoveredEmail}
              </p>
              <p className="text-text-secondary text-xs mt-2">
                Enter the 6-digit verification code to access your tickets.
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="recovery-otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1 block text-center">
                6-Digit Passcode
              </label>
              <input
                id="recovery-otp"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="done"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="w-full text-center font-black bg-white/5 border border-border-subtle rounded-2xl text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-300 font-mono text-xl sm:text-3xl py-2.5 sm:py-4 tracking-[0.3em] sm:tracking-[0.6em] pl-[0.3em] sm:pl-[0.6em]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isVerifyingOtp}
                className="flex-grow py-3 px-5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-60"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={handleResendRecoveryOtp}
                disabled={recoveryCooldown > 0 || isRecovering}
                className="flex-grow py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
              >
                {recoveryCooldown > 0 ? `Resend (${recoveryCooldown}s)` : 'Resend Code'}
              </button>
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={handleChangeTransactionId}
                className="text-xs text-text-muted hover:text-white transition-colors"
              >
                ← Change Transaction ID
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="glass p-1 rounded-xl border border-white/5 flex gap-1 w-full">
          <button
            type="button"
            onClick={handleSwitchToReference}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
              lookupMode === 'reference'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Booking Reference
          </button>
          <button
            type="button"
            onClick={handleSwitchToRecovery}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
              lookupMode === 'transaction'
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            Payment ID Recovery
          </button>
        </div>

        {lookupMode === 'reference' ? (
          <form onSubmit={handleSearchSubmit} className="glass rounded-2xl border border-border-subtle p-4 sm:p-6 flex flex-col gap-3">
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
        ) : (
          <form onSubmit={handleRecoverySubmit} className="glass rounded-2xl border border-border-subtle p-4 sm:p-6 flex flex-col gap-3 animate-in fade-in duration-300">
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
        )}
      </div>
    );
  };

  return (
    <div className="pt-20 sm:pt-28 pb-8 sm:pb-16 min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-3xl relative z-10 px-4 space-y-4 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-display-sm font-black text-white tracking-tight">
            {shouldShowPortal ? 'My Tickets' : 'Get Your Tickets'}
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
            className="glass rounded-3xl border border-error/30 bg-error/5 p-4 sm:p-6 space-y-3 sm:space-y-4 text-center animate-in fade-in zoom-in duration-300"
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

        {shouldShowAuthForm && (
          <Modal
            isOpen={shouldShowAuthForm}
            onClose={() => {
              if (showLoginForGuest) {
                setShowLoginForGuest(false);
              } else {
                setIsAuthModalDismissed(true);
              }
            }}
            showCloseButton={false}
          >
            <div className="space-y-6">
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
              
              <AuthForm 
                mode="wallet" 
                isVerificationRequired={isOwnershipVerificationRequired}
                bookingReference={queryRef}
                onSuccess={() => { 
                  const dest = queryRef
                    ? `/dashboard?tab=tickets&ref=${encodeURIComponent(queryRef.trim())}`
                    : '/dashboard?tab=tickets';
                  router.push(dest);
                }} 
                onClose={() => {
                  if (showLoginForGuest) {
                    setShowLoginForGuest(false);
                  } else {
                    setIsAuthModalDismissed(true);
                  }
                }}
              />
              {showLoginForGuest && (
                <button 
                  onClick={() => setShowLoginForGuest(false)} 
                  className="mt-4 w-full text-xs text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded-md py-1"
                >
                  <span>←</span> Cancel and return to ticket
                </button>
              )}
            </div>
          </Modal>
        )}

        {/* SCREEN 3: Consolidated Bookings Portal Dashboard */}
        {shouldShowPortal && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {singleBooking && isAuthenticated && (
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  onClick={handleSearchAnother}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-lg text-text-primary hover:text-white transition-all flex items-center gap-1.5"
                >
                  <span>←</span> Back to My Tickets
                </button>
              </div>
            )}

            {(() => {
              if (singleBooking) {
                return (
                  <BookingCard
                    booking={singleBooking}
                    tickets={singleTickets}
                    ticketsReady={singleBookingData?.ticketsReady ?? false}
                    downloading={downloadingId === singleBooking.bookingId}
                    resending={resendingId === singleBooking.bookingId}
                    resendCooldown={resendCooldowns[singleBooking.bookingId] || 0}
                    onDownload={() => handleDownloadPDF(singleBooking.bookingId, singleBookingSessionToken)}
                    onResend={() => handleResendTickets(singleBooking.bookingId, singleBookingSessionToken)}
                    pollCount={pollCountRef.current}
                    isFetchingSingle={isSingleLookupFetching && !isSingleLookupLoading}
                  />
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
                    {upcomingBookings.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-white font-bold text-lg border-b border-border-subtle/30 pb-2">Upcoming Tickets</h2>
                        <div className="space-y-4 sm:space-y-6">
                          {upcomingBookings.map((b) => (
                            <BookingCard
                              key={b._id}
                              booking={b}
                              tickets={tickets.filter(
                                (t) => t.bookingId === b._id || t.bookingId?.toString() === b._id?.toString()
                              )}
                              ticketsReady={ticketsReadyMap[b._id?.toString() ?? ''] ?? false}
                              isPast={false}
                              isTarget={queryRef ? b.bookingId === queryRef : false}
                              downloading={downloadingId === b.bookingId}
                              resending={resendingId === b.bookingId}
                              resendCooldown={resendCooldowns[b.bookingId] || 0}
                              onDownload={() => handleDownloadPDF(b.bookingId)}
                              onResend={() => handleResendTickets(b.bookingId)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {pastBookings.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-white font-bold text-lg border-b border-border-subtle/30 pb-2">Past Tickets</h2>
                        <div className="space-y-4 sm:space-y-6">
                          {pastBookings.map((b) => (
                            <BookingCard
                              key={b._id}
                              booking={b}
                              tickets={tickets.filter(
                                (t) => t.bookingId === b._id || t.bookingId?.toString() === b._id?.toString()
                              )}
                              ticketsReady={ticketsReadyMap[b._id?.toString() ?? ''] ?? false}
                              isPast={true}
                              isTarget={queryRef ? b.bookingId === queryRef : false}
                              downloading={downloadingId === b.bookingId}
                              resending={resendingId === b.bookingId}
                              resendCooldown={resendCooldowns[b.bookingId] || 0}
                              onDownload={() => handleDownloadPDF(b.bookingId)}
                              onResend={() => handleResendTickets(b.bookingId)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="glass rounded-3xl border border-border-subtle p-6 sm:p-16 text-center space-y-4">
                  <div className="text-4xl">🎫</div>
                  <h3 className="text-white font-bold text-base">No tickets found</h3>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                    Tickets purchased using this email address will appear here automatically.
                  </p>
                  <div className="flex justify-center pt-4">
                    <Link href="/events" className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-accent-purple hover:bg-accent-purple-light text-white text-xs font-bold rounded-xl transition-all shadow-md text-center">
                      Browse Events
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {shouldShowReferenceForm && (
          <div className="space-y-4 pt-4 mt-4 sm:mt-8 max-w-md mx-auto">
            {renderReferenceFormContent()}

            {queryRef && singleLookupApiError && !isOwnershipVerificationRequired && !singleBooking && (
              <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
                {singleLookupApiError.message || `We couldn't retrieve booking ${queryRef}.`}
              </div>
            )}

            {queryRef && isSingleLookupLoading && (
              <div className="glass-strong rounded-3xl border border-border-subtle p-4 sm:p-8 shadow-2xl text-center text-text-muted text-xs animate-pulse">
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
        <div className="text-purple-300 animate-pulse text-sm">Loading My Tickets...</div>
      </div>
    }>
      <TicketRetrievalContent />
    </Suspense>
  );
}
