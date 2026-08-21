'use client';

import React from 'react';

import type { AuthResponse } from '@/types/auth';

import { useAuthFlow } from './hooks/useAuthFlow';
import { useOtpCooldowns } from './hooks/useOtpCooldowns';
import { LoginForm } from './LoginForm';
import { OtpVerifyForm } from './OtpVerifyForm';
import { ProfileCompletionForm } from './ProfileCompletionForm';

export interface AuthFormProps {
  mode: 'login';
  onSuccess?: (data: AuthResponse) => void;
  className?: string;
  initialEmail?: string;
  readonlyEmail?: boolean;
  autoRequestOtp?: boolean;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function AuthForm({
  mode,
  onSuccess,
  className = '',
  initialEmail,
  readonlyEmail,
  autoRequestOtp,
  onClose: _onClose,
  onDirtyChange,
}: AuthFormProps) {
  const {
    requestCooldownRemaining,
    verifyCooldownRemaining,
    resendTimer,
    formatTime,
    triggerRequestCooldown,
    triggerVerifyCooldown,
    startTimer,
  } = useOtpCooldowns();

  const {
    email,
    setEmail,
    otp,
    setOtp,
    step,
    error,
    user,
    token,
    requestVerificationCodeMutation,
    verifyMutation,
    googleLoginMutation,
    handleSubmitEmail,
    handleSubmitOtp,
    handleBackToOptions,
    handleOnboardingCancel,
  } = useAuthFlow({
    initialEmail,
    autoRequestOtp,
    onSuccess,
    onDirtyChange,
    startTimer,
    triggerRequestCooldown,
    triggerVerifyCooldown,
  });

  return (
    <div className={`space-y-4 sm:space-y-6 relative ${className}`}>
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
          readonlyEmail={readonlyEmail}
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
          readonlyEmail={readonlyEmail}
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
