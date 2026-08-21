'use client';

import { useState, useEffect, useRef } from 'react';
import { useOtpCooldowns } from '@/components/auth/hooks/useOtpCooldowns';
import { extractApiError } from '@/lib/api/client';
import {
  publicRecoverBookingEmail,
  publicVerifyRecoveredBookingOTP,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';

interface UseTicketLookupOtpProps {
  targetRef: string | null;
  onBookingFound: () => void;
  onOtpViewReady: () => void;
  onOtpSuccess?: () => void;
  setErrorMsg: (msg: string) => void;
  setInfoMsg: (msg: string) => void;
  setLiveMessage: (msg: string) => void;
}

export function useTicketLookupOtp({
  targetRef,
  onBookingFound,
  onOtpViewReady,
  onOtpSuccess,
  setErrorMsg,
  setInfoMsg,
  setLiveMessage,
}: UseTicketLookupOtpProps) {
  const { login, setOnboardingRequired, isAuthenticated } = useAuth();

  const [bookingRefInput, setBookingRefInput] = useState(targetRef || '');
  const [transactionIdInput, setTransactionIdInput] = useState('');
  const [foundBookingId, setFoundBookingId] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestCooldownRemaining: cooldown, triggerRequestCooldown: setCooldown } =
    useOtpCooldowns({ namespace: 'mad_otp_recovery' });

  const autoLookupRanRef = useRef(false);

  useEffect(() => {
    if (targetRef) {
      setBookingRefInput(targetRef);
      if (!autoLookupRanRef.current && !isAuthenticated) {
        autoLookupRanRef.current = true;
        setIsSubmitting(true);
        publicRecoverBookingEmail(targetRef.trim())
          .then((result) => {
            setFoundBookingId(result.bookingId);
            setFoundEmail(result.guestEmail);
            setCooldown(result.cooldownSeconds || 60);
            setOtpInput('');
            setLiveMessage('Booking found');
            onBookingFound();
            if (result.otpDispatched) {
              setInfoMsg('A verification code has been sent to the registered email.');
              setLiveMessage('Booking found. OTP sent successfully.');
            } else {
              setInfoMsg('A verification code was recently sent. Please wait before resending.');
            }
          })
          .catch((err) => {
            const apiErr = extractApiError(err);
            setErrorMsg(
              apiErr.message || 'No active booking found. Verify the reference and try again.'
            );
            setLiveMessage('Booking lookup failed. ' + (apiErr.message || ''));
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      }
    }
  }, [targetRef, isAuthenticated, setCooldown, onBookingFound, setErrorMsg, setInfoMsg, setLiveMessage]);

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
      onBookingFound();

      if (result.otpDispatched) {
        setInfoMsg('A verification code has been sent to the registered email.');
        setLiveMessage('Booking found. OTP sent successfully.');
      } else {
        setInfoMsg('A verification code was recently sent. Please wait before resending.');
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(
        apiErr.message || 'No active booking found. Verify the reference and try again.'
      );
      setLiveMessage('Booking lookup failed. ' + (apiErr.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = () => {
    setErrorMsg('');
    setInfoMsg('Verification code sent to your email.');
    setLiveMessage('OTP sent successfully.');
    onOtpViewReady();
  };

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
      if (onOtpSuccess) {
        onOtpSuccess();
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Invalid verification code. Please try again.');
      setLiveMessage('OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    bookingRefInput,
    setBookingRefInput,
    transactionIdInput,
    setTransactionIdInput,
    foundBookingId,
    foundEmail,
    otpInput,
    setOtpInput,
    isSubmitting,
    setIsSubmitting,
    cooldown,
    handleLookupSubmit,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtpSubmit,
  };
}
