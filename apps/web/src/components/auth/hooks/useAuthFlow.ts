'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestVerificationCode,
  publicVerifyVerificationCodeOrOTP,
  publicGoogleLogin,
} from '@/lib/api/public.service';
import { mapZodErrorToFields } from '@/lib/validation/mapZodError';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthResponse, VerificationCodeRequestResponse } from '@/types/auth';
import { checkEmailSchema, verifyAuthSchema, normalizeOtp } from '@mad/validations';

interface UseAuthFlowProps {
  initialEmail?: string;
  autoRequestOtp?: boolean;
  onSuccess?: (data: AuthResponse) => void;
  onDirtyChange?: (dirty: boolean) => void;
  startTimer: () => void;
  triggerRequestCooldown: (seconds: number) => void;
  triggerVerifyCooldown: (seconds: number) => void;
}

export function useAuthFlow({
  initialEmail,
  autoRequestOtp,
  onSuccess,
  onDirtyChange,
  startTimer,
  triggerRequestCooldown,
  triggerVerifyCooldown,
}: UseAuthFlowProps) {
  const { login, logout, token, setOnboardingRequired, onboardingRequired, user } = useAuth();

  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'onboard'>(
    autoRequestOtp && initialEmail ? 'verify' : 'request'
  );
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

  const hasAutoRequestedRef = useRef(false);
  useEffect(() => {
    if (autoRequestOtp && initialEmail && !hasAutoRequestedRef.current) {
      hasAutoRequestedRef.current = true;
      setEmail(initialEmail);
      publicRequestVerificationCode(initialEmail.trim().toLowerCase())
        .then(() => {
          setStep('verify');
          setError('');
          startTimer();
        })
        .catch((err) => {
          const apiErr = extractApiError(err);
          setError(apiErr.message);
        });
    }
  }, [autoRequestOtp, initialEmail, startTimer]);

  // Auto transition to onboard step if authenticated but profile is incomplete
  useEffect(() => {
    if (token && onboardingRequired && step !== 'onboard') {
      setStep('onboard');
    }
  }, [token, onboardingRequired, step]);

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

  // Request verification code / OTP passcode dispatch
  const requestVerificationCodeMutation = useMutation<VerificationCodeRequestResponse, Error, void>({
    mutationFn: () => publicRequestVerificationCode(email.trim().toLowerCase()),
    onSuccess: () => {
      setStep('verify');
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
      if (data.onboardingRequired) {
        setStep('onboard');
      } else if (onSuccess) {
        onSuccess(data);
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
      } else if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanedData = { email: email.trim().toLowerCase() };
    if (!cleanedData.email) {
      setError('Email address is required');
      return;
    }

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

    const cleanedData = {
      email: email.trim().toLowerCase(),
      otp: normalizeOtp(otp),
    };

    if (cleanedData.otp.length !== 6) {
      setError('Please enter a valid 6-digit passcode');
      return;
    }

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

  const handleOnboardingCancel = () => {
    logout();
    setStep('request');
  };

  return {
    email,
    setEmail,
    otp,
    setOtp,
    step,
    error,
    user,
    token,
    firstFocusableRef,
    requestVerificationCodeMutation,
    verifyMutation,
    googleLoginMutation,
    handleSubmitEmail,
    handleSubmitOtp,
    handleBackToOptions,
    handleOnboardingCancel,
  };
}
