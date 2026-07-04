'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

import { FindTicketsModal } from './components/FindTicketsModal';
import dynamic from 'next/dynamic';

const BookingFoundModal = dynamic(
  () => import('./components/BookingFoundModal').then((mod) => mod.BookingFoundModal),
  { ssr: false }
);
const OtpVerificationModal = dynamic(
  () => import('./components/OtpVerificationModal').then((mod) => mod.OtpVerificationModal),
  { ssr: false }
);
const ContactSupportModal = dynamic(
  () => import('./components/ContactSupportModal').then((mod) => mod.ContactSupportModal),
  { ssr: false }
);

type ModalState = 'find' | 'found' | 'otp' | 'support' | null;

function TicketRetrievalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetRef = searchParams.get('ref');

  const { login, setOnboardingRequired, isAuthenticated, isLoading: isAuthLoading } = useAuth();

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
  const handleClose = useCallback(() => {
    setActiveModal(null);
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

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

      <FindTicketsModal
        isOpen={activeModal === 'find'}
        onClose={handleClose}
        bookingRefInput={bookingRefInput}
        setBookingRefInput={setBookingRefInput}
        transactionIdInput={transactionIdInput}
        setTransactionIdInput={setTransactionIdInput}
        isSubmitting={isSubmitting}
        errorMsg={errorMsg}
        onSubmit={handleLookupSubmit}
        onOpenSupport={() => {
          setErrorMsg('');
          setActiveModal('support');
        }}
      />

      <BookingFoundModal
        isOpen={activeModal === 'found'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('find');
        }}
        foundEmail={foundEmail}
        errorMsg={errorMsg}
        handleSendOtp={handleSendOtp}
        isSubmitting={isSubmitting}
        googleBtnRef={googleBtnRef}
      />

      <OtpVerificationModal
        isOpen={activeModal === 'otp'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('found');
        }}
        foundEmail={foundEmail}
        errorMsg={errorMsg}
        infoMsg={infoMsg}
        otpInput={otpInput}
        setOtpInput={setOtpInput}
        isSubmitting={isSubmitting}
        cooldown={cooldown}
        onSubmit={handleVerifyOtpSubmit}
        handleResendOtp={handleResendOtp}
      />

      <ContactSupportModal
        isOpen={activeModal === 'support'}
        onClose={handleClose}
        onGoBack={() => {
          setErrorMsg('');
          setActiveModal('find');
        }}
        supportName={supportName}
        setSupportName={setSupportName}
        supportEmail={supportEmail}
        setSupportEmail={setSupportEmail}
        supportRef={supportRef}
        setSupportRef={setSupportRef}
        supportMessage={supportMessage}
        setSupportMessage={setSupportMessage}
        supportStatus={supportStatus}
        setSupportStatus={setSupportStatus}
        supportError={supportError}
        onSubmit={handleSupportFormSubmit}
      />
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
