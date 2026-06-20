'use client';

import React from 'react';
import { Button } from '@mad/ui';

export interface OtpVerifyFormProps {
  email: string;
  otp: string;
  setOtp: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  verifyCooldownRemaining: number;
  formatTime: (seconds: number) => string;
  error: string;
  onBack: () => void;
  resendTimer: number;
  requestCooldownRemaining: number;
  requestVerificationCodeIsPending: boolean;
  onResend: () => void;
  isCheckout: boolean;
}

export function OtpVerifyForm({
  email,
  otp,
  setOtp,
  onSubmit,
  isPending,
  verifyCooldownRemaining,
  formatTime,
  error,
  onBack,
  resendTimer,
  requestCooldownRemaining,
  requestVerificationCodeIsPending,
  onResend,
  isCheckout,
}: OtpVerifyFormProps) {
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitized);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:space-y-6">
      {/* Scrollable Content Area */}
      <div className="flex-grow">
        <div className="text-center mb-6 space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">Secure Login</h2>
          <p className="text-text-secondary text-xs leading-relaxed">
            Enter the verification code sent to
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm px-2 w-full">
            <span className="text-white font-semibold break-all max-w-[200px] sm:max-w-xs">{email}</span>
            <button
              type="button"
              onClick={onBack}
              className="text-accent-purple hover:text-accent-purple-light font-bold text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded px-2 py-1 transition-colors min-h-[32px] min-w-[44px] flex items-center justify-center"
              aria-label="Edit email address"
            >
              [Edit]
            </button>
          </div>
          {/* Success helper text */}
          <p className="text-text-muted text-xs mt-2">
            Verification code sent to your email.
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1 block text-center">
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
            enterKeyHint="done"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            onPaste={handlePaste}
            placeholder="000000"
            className={`w-full text-center font-black bg-white/5 border border-border-subtle rounded-2xl text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-300 font-mono ${
              isCheckout ? 'text-xl sm:text-2xl py-2 sm:py-2.5 tracking-[0.3em] sm:tracking-[0.4em] pl-[0.3em] sm:pl-[0.4em]' : 'text-xl sm:text-3xl py-2.5 sm:py-4 tracking-[0.3em] sm:tracking-[0.6em] pl-[0.3em] sm:pl-[0.6em]'
            }`}
          />
          {/* OTP Validation error rendering */}
          {verifyCooldownRemaining > 0 && (
            <div 
              role="alert"
              aria-live="assertive"
              className="text-center text-xs text-red-500 font-medium mt-2 animate-in fade-in duration-200"
            >
              Verification attempts temporarily paused. Try again in {formatTime(verifyCooldownRemaining)}.
            </div>
          )}
          {verifyCooldownRemaining <= 0 && error && (
            <div 
              role="alert"
              aria-live="assertive"
              className="text-center text-xs text-red-500 font-medium mt-2 animate-in fade-in duration-200"
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Row Actions */}
      <div className="max-sm:sticky max-sm:-bottom-6 max-sm:-mx-6 max-sm:px-6 max-sm:py-4 max-sm:bg-[#0d111d] max-sm:border-t max-sm:border-white/10 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-3 w-full z-10 mt-6 sm:mt-8">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          className="py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-sm"
          disabled={otp.length !== 6 || isPending}
          isLoading={isPending}
        >
          Verify Code
        </Button>

        {(() => {
          const isCooldownActive = requestCooldownRemaining > 0 || resendTimer > 0;
          let cooldownText = 'Resend Code';
          if (requestCooldownRemaining > 0) {
            cooldownText = `Resend (${formatTime(requestCooldownRemaining)})`;
          } else if (resendTimer > 0) {
            cooldownText = `Resend (${resendTimer}s)`;
          }

          return (
            <button
              type="button"
              onClick={() => {
                if (isCooldownActive) return;
                setOtp('');
                onResend();
              }}
              disabled={requestVerificationCodeIsPending || isCooldownActive}
              className={`w-full text-center font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple py-3.5 text-sm ${
                isCooldownActive
                  ? 'text-text-muted/50 bg-white/5 border border-white/5 cursor-not-allowed'
                  : 'text-accent-purple hover:text-accent-purple-light border border-accent-purple/20 hover:border-accent-purple/40 bg-accent-purple/5'
              }`}
            >
              {cooldownText}
            </button>
          );
        })()}
      </div>
    </form>
  );
}
