'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicRequestVerificationCode, publicVerifyVerificationCodeOrOTP, publicGoogleLogin } from '@/lib/api/public.service';
import { mapZodErrorToFields } from '@/lib/validation/mapZodError';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthResponse, VerificationCodeRequestResponse } from '@/types/auth';
import { checkEmailSchema, verifyAuthSchema, normalizeOtp } from '@mad/validations';

import { useOtpCooldowns } from './hooks/useOtpCooldowns';
import { LoginForm } from './LoginForm';
import { OtpVerifyForm } from './OtpVerifyForm';
import { ProfileCompletionForm } from './ProfileCompletionForm';

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

export interface AuthFormProps {
  mode: 'login';
  onSuccess?: (data: AuthResponse) => void;
  className?: string;
  initialEmail?: string;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}


export function AuthForm({
  mode,
  onSuccess,
  className = '',
  initialEmail,
  onClose,
  onDirtyChange,
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

  // Expose dirty state to parent provider
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(email !== '' || otp !== '');
    }
  }, [email, otp, onDirtyChange]);

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

  // Manage focus on step change
  const firstFocusableRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const STEP_FOCUS_IDS: Record<'request' | 'verify' | 'onboard', string> = {
      request: 'email',
      verify: 'otp',
      onboard: 'firstName',
    };
    const focusTargetId = STEP_FOCUS_IDS[step];

    const timer = setTimeout(() => {
      const el = document.getElementById(focusTargetId) as HTMLInputElement | null;
      if (el) {
        firstFocusableRef.current = el;
        el.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [step]);

  // ─── React Query Mutations ───────────────────────────────────

  // Request verification code / OTP passcode dispatch
  const requestVerificationCodeMutation = useMutation<VerificationCodeRequestResponse, Error, void>({
    mutationFn: () => publicRequestVerificationCode(email.trim().toLowerCase()),
    onSuccess: (res) => {
      setStep('verify');
      setError('');
      startTimer();
      // Suppress unused res warning — message was previously shown in duplicate banner
      void res;
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

  // Form Submissions
  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    setOtp('');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setOtp('');
      setError('');
      setStep('request');
    }
  };

  const handleOnboardingCancel = () => {
    logout();
    setStep('request');
  };

  return (
    <div className={`space-y-4 sm:space-y-6 relative ${className}`}>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-4 -right-4 text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-md min-h-[44px] min-w-[44px] z-50 transition-all flex items-center justify-center"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
          googleLoginIsPending={googleLoginMutation.isPending}
          onGoogleLoginSuccess={(credential) => googleLoginMutation.mutate(credential)}
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
        />
      )}

      {/* SCREEN 3: Profile Onboarding Form */}
      {step === 'onboard' && (
        <ProfileCompletionForm
          initialFirstName={user?.firstName || ''}
          initialLastName={user?.lastName || ''}
          initialMobileNumber={user?.mobileNumber || ''}
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
