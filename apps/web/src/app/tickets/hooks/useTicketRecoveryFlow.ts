'use client';

import { useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGoogleSignIn } from '@/components/auth/hooks/useGoogleSignIn';
import { extractApiError } from '@/lib/api/client';
import { publicGoogleLogin } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';

import { useTicketLookupOtp } from './useTicketLookupOtp';
import { useTicketSupportForm } from './useTicketSupportForm';

export type ModalState = 'find' | 'found' | 'otp' | 'support' | null;

export function useTicketRecoveryFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetRef = searchParams.get('ref');

  const { login, setOnboardingRequired } = useAuth();

  const [activeModal, setActiveModal] = useState<ModalState>('find');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [liveMessage, setLiveMessage] = useState('');

  const googleBtnRef = useRef<HTMLDivElement>(null);

  const lookupOtp = useTicketLookupOtp({
    targetRef,
    onBookingFound: () => setActiveModal('found'),
    onOtpViewReady: () => setActiveModal('otp'),
    onOtpSuccess: () => setActiveModal(null),
    setErrorMsg,
    setInfoMsg,
    setLiveMessage,
  });

  const supportForm = useTicketSupportForm({
    onSuccessMessage: setLiveMessage,
    onErrorMessage: setLiveMessage,
  });

  const { gsiLoaded, renderButton } = useGoogleSignIn({
    onSuccess: async (credential) => {
      lookupOtp.setIsSubmitting(true);
      setErrorMsg('');
      setLiveMessage('Signing in with Google...');
      try {
        const data = await publicGoogleLogin(credential);
        login(data.token, data.user);
        setOnboardingRequired(!!data.onboardingRequired);
        setLiveMessage('Successfully authenticated with Google.');
        setActiveModal(null);
      } catch (err) {
        const apiErr = extractApiError(err);
        setErrorMsg(apiErr.message || 'Google authentication failed.');
        setLiveMessage('Google authentication failed.');
      } finally {
        lookupOtp.setIsSubmitting(false);
      }
    },
    onError: (err) => {
      setErrorMsg(err);
      setLiveMessage('Google authentication failed.');
    },
  });

  const handleClose = useCallback(() => {
    setActiveModal(null);
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  return {
    activeModal,
    setActiveModal,
    googleBtnRef,
    gsiLoaded,
    renderGoogleButton: renderButton,
    errorMsg,
    setErrorMsg,
    infoMsg,
    liveMessage,
    handleClose,

    // Lookup & OTP bindings
    bookingRefInput: lookupOtp.bookingRefInput,
    setBookingRefInput: lookupOtp.setBookingRefInput,
    transactionIdInput: lookupOtp.transactionIdInput,
    setTransactionIdInput: lookupOtp.setTransactionIdInput,
    foundEmail: lookupOtp.foundEmail,
    otpInput: lookupOtp.otpInput,
    setOtpInput: lookupOtp.setOtpInput,
    isSubmitting: lookupOtp.isSubmitting,
    cooldown: lookupOtp.cooldown,
    handleLookupSubmit: lookupOtp.handleLookupSubmit,
    handleSendOtp: lookupOtp.handleSendOtp,
    handleResendOtp: lookupOtp.handleResendOtp,
    handleVerifyOtpSubmit: lookupOtp.handleVerifyOtpSubmit,

    // Support Form bindings
    supportName: supportForm.supportName,
    setSupportName: supportForm.setSupportName,
    supportEmail: supportForm.supportEmail,
    setSupportEmail: supportForm.setSupportEmail,
    supportRef: supportForm.supportRef,
    setSupportRef: supportForm.setSupportRef,
    supportMessage: supportForm.supportMessage,
    setSupportMessage: supportForm.setSupportMessage,
    supportStatus: supportForm.supportStatus,
    setSupportStatus: supportForm.setSupportStatus,
    supportError: supportForm.supportError,
    handleSupportFormSubmit: supportForm.handleSupportFormSubmit,
  };
}
