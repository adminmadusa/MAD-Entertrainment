'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal, ArrowLeft } from '@mad/ui';

import { extractApiError } from '@/lib/api/client';
import {
  publicRecoverBookingEmail,
  publicVerifyRecoveredBookingOTP,
  publicGoogleLogin,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { submitContactForm } from '@/app/actions/contact.actions';
import { useGoogleSignIn } from '@/components/auth/hooks/useGoogleSignIn';
import { useOtpCooldowns } from '@/components/auth/hooks/useOtpCooldowns';

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement | null,
    options: {
      theme?: string;
      size?: string;
      width?: string;
      shape?: string;
      text?: string;
    }
  ): void;
}

interface GoogleIdentity {
  accounts: {
    id: GoogleAccountsId;
  };
}

type ModalState = 'find' | 'found' | 'otp' | 'support' | null;

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetRef = searchParams.get('ref');

  const { login, setOnboardingRequired, isAuthenticated, isLoading: isAuthLoading, onboardingRequired } = useAuth();

  // Modal State Machine
  const [activeModal, setActiveModal] = useState<ModalState>('find');

  // Input States
  const [bookingRefInput, setBookingRefInput] = useState(targetRef || '');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  
  // Found/OTP States
  const [foundBookingId, setFoundBookingId] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const { requestCooldownRemaining: cooldown, triggerRequestCooldown: setCooldown } = useOtpCooldowns({ namespace: 'mad_otp_recovery' });

  const googleBtnRef = useRef<HTMLDivElement>(null);

  const { gsiLoaded, renderButton } = useGoogleSignIn({
    onSuccess: async (credential) => {
      setIsSubmitting(true);
      setErrorMsg('');
      setLiveMessage('Signing in with Google...');
      try {
        const data = await publicGoogleLogin(credential);
        login(data.token, data.user);
        setOnboardingRequired(!!data.onboardingRequired);
        setLiveMessage('Successfully authenticated with Google.');
        
        const targetBookingId = foundBookingId || bookingRefInput.trim().toUpperCase();
        const dest = targetBookingId.startsWith('MAD-')
          ? `/dashboard?tab=tickets&ref=${encodeURIComponent(targetBookingId)}`
          : `/dashboard?tab=tickets`;
        router.push(dest);
      } catch (err) {
        const apiErr = extractApiError(err);
        setErrorMsg(apiErr.message || 'Google authentication failed.');
        setLiveMessage('Google authentication failed.');
      } finally {
        setIsSubmitting(false);
      }
    },
    onError: (err) => {
      setErrorMsg(err);
      setLiveMessage('Google authentication failed.');
    }
  });

  useEffect(() => {
    if (activeModal === 'found' && gsiLoaded && googleBtnRef.current) {
      renderButton(googleBtnRef.current);
    }
  }, [activeModal, gsiLoaded, renderButton]);

  // Support Form States
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportRef, setSupportRef] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportStatus, setSupportStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [supportError, setSupportError] = useState('');

  // General Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // ARIA Live region announcement state
  const [liveMessage, setLiveMessage] = useState('');

  // Sync reference from URL parameters if provided
  useEffect(() => {
    if (targetRef) {
      setBookingRefInput(targetRef);
    }
  }, [targetRef]);



  // Redirect to dashboard if authenticated on mount or after login
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      const dest = targetRef || foundBookingId
        ? `/dashboard?tab=tickets&ref=${encodeURIComponent((targetRef || foundBookingId).trim().toUpperCase())}`
        : '/dashboard?tab=tickets';
      router.replace(dest);
    }
  }, [isAuthenticated, isAuthLoading, targetRef, foundBookingId, router]);

  // Close flow - redirects back or to home page
  const handleClose = () => {
    setActiveModal(null);
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // 1. Submit Lookup (Booking Reference or Payment Transaction ID)
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLiveMessage('');

    const bookingRef = bookingRefInput.trim();
    const transactionId = transactionIdInput.trim();

    if (!bookingRef && !transactionId) {
      setErrorMsg('Please enter a Booking Reference or a Payment / Transaction ID.');
      return;
    }

    setIsSubmitting(true);
    const queryInput = bookingRef || transactionId;

    try {
      const result = await publicRecoverBookingEmail(queryInput);
      setFoundBookingId(result.bookingId);
      setFoundEmail(result.guestEmail);
      setCooldown(result.cooldownSeconds || 60);
      setOtpInput('');
      
      setLiveMessage('Booking found');
      setActiveModal('found');

      if (result.otpDispatched) {
        setInfoMsg('A verification code has been sent to the registered email.');
        setLiveMessage('Booking found. OTP sent successfully.');
      } else {
        setInfoMsg('A verification code was recently sent. Please wait before resending.');
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'No active booking found. Verify the reference and try again.');
      setLiveMessage('Booking lookup failed. ' + (apiErr.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Dispatch OTP / Send OTP Action from Found Modal
  const handleSendOtp = () => {
    setErrorMsg('');
    setInfoMsg('Verification code sent to your email.');
    setLiveMessage('OTP sent successfully.');
    setActiveModal('otp');
  };

  // 3. Resend OTP from OTP Modal
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setErrorMsg('');
    setInfoMsg('');
    setIsSubmitting(true);
    setLiveMessage('Resending verification code...');

    const queryInput = bookingRefInput.trim() || transactionIdInput.trim();

    try {
      const result = await publicRecoverBookingEmail(queryInput);
      setCooldown(result.cooldownSeconds || 60);
      setOtpInput('');
      if (result.otpDispatched) {
        setInfoMsg('A new verification code has been sent.');
        setLiveMessage('OTP sent successfully.');
      } else {
        setInfoMsg('A verification code was recently sent. Please wait.');
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to resend verification code.');
      setLiveMessage('Failed to resend verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Verify OTP Code
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLiveMessage('');

    const otp = otpInput.trim().replace(/\s/g, '');
    if (!otp) {
      setErrorMsg('Verification code is required.');
      return;
    }
    if (otp.length !== 6) {
      setErrorMsg('Verification code must be 6 digits.');
      return;
    }

    setIsSubmitting(true);
    setLiveMessage('Verifying code...');
    const queryInput = bookingRefInput.trim() || transactionIdInput.trim();

    try {
      const result = await publicVerifyRecoveredBookingOTP(queryInput, otp);
      login(result.token, result.user);
      setOnboardingRequired(!!result.onboardingRequired);
      setLiveMessage('Successfully authenticated.');
      setInfoMsg('Successfully authenticated! Loading your tickets...');
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Invalid verification code. Please try again.');
      setLiveMessage('OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit Support Request
  const handleSupportFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportStatus('submitting');
    setSupportError('');
    setLiveMessage('Submitting support request...');

    const formData = new FormData();
    formData.append('name', supportName);
    formData.append('email', supportEmail);
    formData.append('issueType', 'ticket');
    formData.append('bookingRef', supportRef);
    formData.append('message', supportMessage);

    try {
      const result = await submitContactForm(formData);
      if (result.success) {
        setSupportStatus('success');
        setLiveMessage('Support request submitted successfully.');
        setSupportName('');
        setSupportEmail('');
        setSupportRef('');
        setSupportMessage('');
      } else {
        setSupportStatus('error');
        setSupportError(result.message || 'Failed to submit. Please try again.');
        setLiveMessage('Support request submission failed.');
      }
    } catch (err) {
      setSupportStatus('error');
      setSupportError('Failed to connect to the support server.');
      setLiveMessage('Support request submission failed.');
    }
  };



  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      
      {/* Accessibility Screen Reader Live Announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Screen 1: Find My Tickets Modal */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={activeModal === 'find'}
        onClose={handleClose}
        closeOnBackdropClick={true}
        enableSwipeToClose={true}
        ariaLabelledBy="find-title"
        ariaDescribedBy="find-desc"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 id="find-title" className="text-2xl font-black text-white tracking-tight">
              Find My Tickets
            </h2>
            <p id="find-desc" className="text-text-secondary text-sm mt-1.5 leading-relaxed">
              Retrieve your booking using either reference ID or transaction ID.
            </p>
          </div>

          {errorMsg && (
            <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium animate-in fade-in duration-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLookupSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="bookingRef" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Booking Reference
              </label>
              <input
                id="bookingRef"
                type="text"
                value={bookingRefInput}
                onChange={(e) => {
                  setBookingRefInput(e.target.value);
                  if (e.target.value) setTransactionIdInput('');
                }}
                placeholder="e.g. MAD-2026-ABCDE"
                disabled={isSubmitting}
                aria-invalid={!!errorMsg && !transactionIdInput}
                aria-describedby={errorMsg && !transactionIdInput ? "find-error-message" : undefined}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all font-mono uppercase tracking-wider"
              />
            </div>

            <div className="flex items-center py-2">
              <div className="flex-grow border-t border-border-subtle/30" />
              <span className="mx-4 text-xs font-bold text-text-muted/40 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-border-subtle/30" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="transactionId" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Payment / Transaction ID
              </label>
              <input
                id="transactionId"
                type="text"
                value={transactionIdInput}
                onChange={(e) => {
                  setTransactionIdInput(e.target.value);
                  if (e.target.value) setBookingRefInput('');
                }}
                placeholder="e.g. pay_xxxxxxxxxxxx"
                disabled={isSubmitting}
                aria-invalid={!!errorMsg && !bookingRefInput}
                aria-describedby={errorMsg && !bookingRefInput ? "find-error-message" : undefined}
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all font-mono tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!bookingRefInput.trim() && !transactionIdInput.trim())}
              aria-label="Find Tickets"
              className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finding Tickets...
                </>
              ) : (
                'Find Tickets'
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setActiveModal('support');
              }}
              className="text-xs font-semibold text-text-muted hover:text-white transition-colors py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded"
            >
              Having issues? Contact Support
            </button>
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Screen 2: Booking Found Modal */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={activeModal === 'found'}
        onClose={handleClose}
        closeOnBackdropClick={true}
        enableSwipeToClose={true}
        ariaLabelledBy="found-title"
        ariaDescribedBy="found-desc"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setActiveModal('find');
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 id="found-title" className="text-xl font-black text-white">
              Booking Found!
            </h2>
          </div>

          <div className="p-5 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-center space-y-3">
            <p id="found-desc" className="text-text-secondary text-xs leading-relaxed">
              We found your ticket booking under the following email address:
            </p>
            <p className="text-white font-mono font-bold text-sm bg-white/5 border border-white/10 rounded-xl py-3 px-4 break-all select-all selection:bg-accent-purple/50">
              {foundEmail}
            </p>
            <p className="text-text-muted text-[10px] leading-relaxed">
              Please verify ownership using OTP or Google authentication to access your tickets.
            </p>
          </div>

          {errorMsg && (
            <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={isSubmitting}
              aria-label="Send OTP code"
              className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              Send OTP Code
            </button>

            <div className="flex items-center">
              <div className="flex-grow border-t border-border-subtle/30" />
              <span className="mx-4 text-xs font-bold text-text-muted/40 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-border-subtle/30" />
            </div>

            <div className="space-y-3">
              <div
                ref={googleBtnRef}
                id="google-signin-btn-found"
                className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
              />
              {isSubmitting && (
                <p className="text-center text-xs text-purple-300/80 animate-pulse">
                  Authenticating...
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Screen 3: OTP Verification Modal */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={activeModal === 'otp'}
        onClose={handleClose}
        closeOnBackdropClick={true}
        enableSwipeToClose={true}
        ariaLabelledBy="otp-title"
        ariaDescribedBy="otp-desc"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setActiveModal('found');
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 id="otp-title" className="text-xl font-black text-white">
              Verification Required
            </h2>
          </div>

          <div className="text-center">
            <p id="otp-desc" className="text-text-secondary text-sm leading-relaxed">
              Enter the 6-digit verification code sent to <span className="text-white font-semibold">{foundEmail}</span>
            </p>
          </div>

          {errorMsg && (
            <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div role="status" aria-live="polite" className="p-3.5 bg-accent-purple/10 border border-accent-purple/30 rounded-xl text-xs text-purple-300 text-center font-medium">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block text-center">
                6-Digit Passcode
              </label>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                disabled={isSubmitting}
                aria-invalid={!!errorMsg}
                aria-describedby={errorMsg ? "otp-error" : undefined}
                className="w-full text-center font-black bg-white/5 border border-border-subtle rounded-2xl text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-300 font-mono text-2xl sm:text-3xl py-3 tracking-[0.3em] pl-[0.3em]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || otpInput.length !== 6}
                aria-label="Verify OTP"
                className="flex-grow py-3.5 px-5 btn-gradient text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || isSubmitting}
                aria-label="Resend OTP code"
                className="flex-grow py-3.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────── */}
      {/* Screen 4: Contact Support Modal */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={activeModal === 'support'}
        onClose={handleClose}
        closeOnBackdropClick={true}
        enableSwipeToClose={true}
        ariaLabelledBy="support-title"
        ariaDescribedBy="support-desc"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setActiveModal('find');
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 id="support-title" className="text-xl font-black text-white">
              Contact Support
            </h2>
          </div>

          <p id="support-desc" className="text-text-secondary text-xs leading-relaxed">
            Need help retrieving your tickets? Fill out this request and our support team will contact you shortly.
          </p>

          {supportStatus === 'success' ? (
            <div className="bg-accent-purple/15 border border-accent-purple/35 rounded-2xl p-6 text-center space-y-3 animate-in fade-in duration-300">
              <span className="text-3xl block">✅</span>
              <h3 className="text-white font-bold text-base">Request Submitted</h3>
              <p className="text-text-secondary text-xs leading-relaxed">
                Thank you! Your request was received. We will check the booking details and contact you via email soon.
              </p>
              <button
                type="button"
                onClick={() => setSupportStatus('idle')}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold rounded-xl transition-all"
              >
                Send Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSupportFormSubmit} className="space-y-4">
              {supportStatus === 'error' && (
                <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 font-medium">
                  {supportError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="supportName" className="text-xs font-semibold text-text-secondary block">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="supportName"
                  type="text"
                  required
                  value={supportName}
                  onChange={(e) => setSupportName(e.target.value)}
                  placeholder="e.g. John Doe"
                  disabled={supportStatus === 'submitting'}
                  className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supportEmail" className="text-xs font-semibold text-text-secondary block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="supportEmail"
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  disabled={supportStatus === 'submitting'}
                  className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supportRef" className="text-xs font-semibold text-text-secondary block">
                  Booking Reference / Transaction ID
                </label>
                <input
                  id="supportRef"
                  type="text"
                  value={supportRef}
                  onChange={(e) => setSupportRef(e.target.value)}
                  placeholder="e.g. MAD-YYYY-XXXXX or pay_xxxx"
                  disabled={supportStatus === 'submitting'}
                  className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="supportMessage" className="text-xs font-semibold text-text-secondary block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="supportMessage"
                  required
                  rows={4}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Tell us what issues you are experiencing..."
                  disabled={supportStatus === 'submitting'}
                  className="w-full bg-white/5 border border-border-subtle rounded-xl px-3.5 py-2.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={supportStatus === 'submitting'}
                aria-label="Submit support request"
                className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {supportStatus === 'submitting' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </form>
          )}
        </div>
      </Modal>
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
