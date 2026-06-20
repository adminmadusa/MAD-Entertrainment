'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestVerificationCode,
  publicVerifyVerificationCodeOrOTP,
  publicGoogleLogin,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { setGoogleIdentityCallback } from '@/utils/google-identity';
import { AuthResponse, VerificationCodeRequestResponse } from '@/types/auth';
import { ProfileCompletionForm } from './ProfileCompletionForm';
import { checkEmailSchema, verifyAuthSchema, normalizeOtp } from '@mad/validations';
import { mapZodErrorToFields } from '@/lib/validation/mapZodError';

import { useOtpCooldowns } from './hooks/useOtpCooldowns';
import { LoginForm } from './LoginForm';
import { OtpVerifyForm } from './OtpVerifyForm';

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

export interface AuthFormProps {
  mode: 'login' | 'wallet' | 'checkout';
  onSuccess?: (data: AuthResponse) => void;
  onGuestContinue?: () => void;
  className?: string;
  isVerificationRequired?: boolean;
  bookingReference?: string;
  initialEmail?: string;
  onClose?: () => void;
}

export function AuthForm({
  mode,
  onSuccess,
  onGuestContinue,
  className = '',
  isVerificationRequired,
  bookingReference,
  initialEmail,
  onClose,
}: AuthFormProps) {
  const { login, logout, token, setOnboardingRequired, onboardingRequired, user } = useAuth();

  const {
    requestCooldownRemaining,
    verifyCooldownRemaining,
    resendTimer,
    formatTime,
    triggerRequestCooldown,
    triggerVerifyCooldown,
    startTimer,
  } = useOtpCooldowns();

  // Core Authentication States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'onboard'>('request');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  // Auto transition to onboard step if authenticated but profile is incomplete
  useEffect(() => {
    if (token && onboardingRequired && step !== 'onboard') {
      setStep('onboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, onboardingRequired]);

  useEffect(() => {
    if (step === 'request') {
      setTimeout(() => {
        const checkoutEmailEl = document.getElementById('checkout-login-email');
        const emailEl = document.getElementById('email');
        if (checkoutEmailEl) checkoutEmailEl.focus();
        else if (emailEl) emailEl.focus();
      }, 50);
    } else if (step === 'verify') {
      setTimeout(() => {
        const otpEl = document.getElementById('otp');
        if (otpEl) otpEl.focus();
      }, 50);
    } else if (step === 'onboard') {
      setTimeout(() => {
        const firstNameEl = document.getElementById('firstName');
        if (firstNameEl) firstNameEl.focus();
      }, 50);
    }
  }, [step]);

  // Google GSI reference markers to prevent concurrent initializations
  const googleCallbackRef = useRef<(response: GoogleCredentialResponse) => void>(() => {});

  // ─── React Query Mutations ───────────────────────────────────

  // Request verification code / OTP passcode dispatch
  const requestVerificationCodeMutation = useMutation<VerificationCodeRequestResponse, Error, void>({
    mutationFn: () => publicRequestVerificationCode(email.trim().toLowerCase()),
    onSuccess: (res) => {
      setStep('verify');
      setInfoMessage(res.message || 'Verification passcode dispatched. Please check your inbox.');
      setError('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'RATE_LIMIT_EXCEEDED' || apiErr.code === 'OTP_COOLDOWN_ACTIVE') {
        triggerRequestCooldown(apiErr.retryAfter ?? 60);
        setError('');
      } else {
        setError(apiErr.message || 'Failed to send verification code. Please try again.');
      }
    },
  });

  // Verify OTP Code
  const verifyMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (otpCode: string) =>
      publicVerifyVerificationCodeOrOTP({
        otp: otpCode,
        email: email.trim().toLowerCase(),
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      setOnboardingRequired(!!data.onboardingRequired);
      setError('');
      setOtp('');
      setInfoMessage('');
      if (data.onboardingRequired) {
        setStep('onboard');
      } else {
        if (onSuccess) {
          onSuccess(data);
        }
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'RATE_LIMIT_EXCEEDED') {
        triggerVerifyCooldown(apiErr.retryAfter ?? 60);
        setError('');
      } else {
        setError(apiErr.message || 'Invalid verification code. Please request a new code.');
      }
    },
  });

  // Google Single Tap OAuth Verification
  const googleLoginMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (idToken: string) => publicGoogleLogin(idToken),
    onSuccess: (data) => {
      login(data.token, data.user);
      setOnboardingRequired(!!data.onboardingRequired);
      setError('');
      setInfoMessage('Successfully authenticated with Google!');
      if (data.onboardingRequired) {
        setStep('onboard');
      } else {
        if (onSuccess) {
          onSuccess(data);
        }
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  // Synchronize dynamic callback reference
  useEffect(() => {
    googleCallbackRef.current = (response: GoogleCredentialResponse) => {
      if (response?.credential) {
        googleLoginMutation.mutate(response.credential);
      }
    };
  }, [googleLoginMutation]);

  const handleGoogleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
    googleCallbackRef.current(response);
  }, []);

  // Sync the local callback with the global Google Identity singleton router
  useEffect(() => {
    setGoogleIdentityCallback(handleGoogleCredentialResponse);
    return () => {
      setGoogleIdentityCallback(null);
    };
  }, [handleGoogleCredentialResponse]);

  // Form Submissions
  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    // 1. Normalize
    const cleanedData = {
      email: email.trim().toLowerCase(),
    };

    // 2. Validate empty check to preserve existing error UX
    if (!cleanedData.email) {
      setError('Email address is required');
      return;
    }

    // 3. Validate format and max length via checkEmailSchema
    const result = checkEmailSchema.safeParse(cleanedData);
    if (!result.success) {
      const errors = mapZodErrorToFields(result.error);
      setError(errors.email || 'Invalid email format');
      return;
    }

    requestVerificationCodeMutation.mutate();
  };

  const handleSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Normalize
    const cleanedData = {
      email: email.trim().toLowerCase(),
      otp: normalizeOtp(otp),
    };

    // 2. Validate length to preserve exact user-facing error message wording
    if (cleanedData.otp.length !== 6) {
      setError('Please enter a valid 6-digit passcode');
      return;
    }

    // 3. Validate using verifyAuthSchema
    const result = verifyAuthSchema.safeParse(cleanedData);
    if (!result.success) {
      const errors = mapZodErrorToFields(result.error);
      setError(errors.otp || errors.email || 'Please enter a valid 6-digit passcode');
      return;
    }

    verifyMutation.mutate(cleanedData.otp);
  };

  const handleBackToOptions = () => {
    setStep('request');
    setError('');
    setInfoMessage('');
    setOtp('');
  };

  const handleClose = () => {
    setOtp('');
    setError('');
    setStep('request');
    if (onClose) onClose();
  };

  const handleOnboardingCancel = () => {
    logout();
    setStep('request');
  };

  const isCheckout = mode === 'checkout';

  return (
    <div className={`space-y-4 sm:space-y-6 relative ${className}`}>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-2 -right-2 text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-md p-1.5 z-50 transition-all flex items-center justify-center"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {infoMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300"
        >
          {infoMessage}
        </div>
      )}

      {/* SCREEN 1: Request OTP Form */}
      {step === 'request' && (
        <LoginForm
          mode={mode}
          email={email}
          setEmail={setEmail}
          onSubmit={handleSubmitEmail}
          isPending={requestVerificationCodeMutation.isPending}
          requestCooldownRemaining={requestCooldownRemaining}
          verifyCooldownRemaining={verifyCooldownRemaining}
          formatTime={formatTime}
          error={error}
          isVerificationRequired={isVerificationRequired}
          onGuestContinue={onGuestContinue}
          googleLoginIsPending={googleLoginMutation.isPending}
        />
      )}

      {/* SCREEN 2: Verification Input Form */}
      {step === 'verify' && (
        <OtpVerifyForm
          email={email}
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleSubmitOtp}
          isPending={verifyMutation.isPending}
          verifyCooldownRemaining={verifyCooldownRemaining}
          formatTime={formatTime}
          error={error}
          onBack={handleBackToOptions}
          resendTimer={resendTimer}
          requestCooldownRemaining={requestCooldownRemaining}
          requestVerificationCodeIsPending={requestVerificationCodeMutation.isPending}
          onResend={() => requestVerificationCodeMutation.mutate()}
          isCheckout={isCheckout}
        />
      )}

      {/* SCREEN 3: Profile Onboarding Form */}
      {step === 'onboard' && (
        <ProfileCompletionForm
          initialFirstName=""
          initialLastName=""
          initialMobileNumber=""
          isCheckout={isCheckout}
          onSuccess={() => {
            if (onSuccess) {
              onSuccess({ token: token!, user: user! });
            }
          }}
          onCancel={handleOnboardingCancel}
        />
      )}
    </div>
  );
}
