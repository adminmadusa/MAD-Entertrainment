'use client';

import React, { useRef, useState } from 'react';

import { Button, FormField } from '@mad/ui';

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
  readonlyEmail?: boolean;
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
  readonlyEmail,
}: OtpVerifyFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitized);
  };

  const digits = Array.from({ length: 6 }, (_, i) => otp[i] || '');

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      {/* Content Area */}
      <div className="flex-grow">
        {/* Title & Subtitle Section: 16px separation */}
        <div className="text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-8">
            Secure Login
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-6 font-normal max-w-[340px] mx-auto">
            Code sent to <span className="font-semibold text-white">{email}</span>
            {!readonlyEmail && (
              <button
                type="button"
                onClick={onBack}
                className="ml-1.5 text-accent-purple hover:text-accent-purple-light hover:underline font-semibold cursor-pointer"
                aria-label="Edit email address"
              >
                (Edit)
              </button>
            )}
          </p>
        </div>

        {/* 6-Digit Passcode Section: 24px section separation */}
        <div className="pt-6">
          <FormField
            label="6-Digit Passcode"
            htmlFor="otp"
            className="text-center [&>label]:text-center [&>label]:block [&>label]:text-xs [&>label]:font-semibold [&>label]:text-text-secondary [&>label]:leading-6 [&>label]:mb-3"
          >
            {/* Interactive 6-Slot Segmented OTP Display */}
            <div
              className="relative flex justify-center items-center cursor-text py-1"
              onClick={() => inputRef.current?.focus()}
            >
              {/* Native transparent input capturing keystrokes & paste */}
              <input
                ref={inputRef}
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
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer pointer-events-auto"
                aria-label="6-Digit Passcode"
              />

              {/* 6 Visual Segmented Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-[10px] w-full">
                {digits.map((digit, idx) => {
                  const isCurrent = isFocused && idx === Math.min(otp.length, 5);
                  const isFilled = Boolean(digit);

                  let slotBorderClass = 'border border-white/10 bg-white/[0.03] text-text-muted/40';
                  if (isCurrent) {
                    slotBorderClass = 'border-2 border-accent-purple bg-accent-purple/10 text-white ring-2 ring-accent-purple/30 scale-105 shadow-md shadow-accent-purple/20';
                  } else if (isFilled) {
                    slotBorderClass = 'border border-white/20 bg-white/[0.08] text-white';
                  }

                  let slotContent: React.ReactNode = <span className="text-white/20 text-xs">●</span>;
                  if (digit) {
                    slotContent = digit;
                  } else if (isCurrent) {
                    slotContent = <span className="animate-pulse text-accent-purple font-light">|</span>;
                  }

                  return (
                    <div
                      key={idx}
                      className={`w-10 h-12 sm:w-11 sm:h-[52px] rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold font-mono transition-all duration-150 select-none ${slotBorderClass}`}
                    >
                      {slotContent}
                    </div>
                  );
                })}
              </div>
            </div>
          </FormField>

          {/* OTP error rendering — inline below field, OTP preserved for retry */}
          {verifyCooldownRemaining > 0 && (
            <p role="alert" className="mt-2 text-xs text-center text-amber-400 font-semibold leading-normal animate-in fade-in duration-200">
              Verification attempts temporarily paused. Try again in {formatTime(verifyCooldownRemaining)}.
            </p>
          )}
          {verifyCooldownRemaining <= 0 && error && (
            <p role="alert" className="mt-2 text-xs text-center text-red-400 font-semibold leading-normal animate-in fade-in duration-200">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons Row: 24px action margin */}
      <div className="grid grid-cols-2 gap-3 w-full pt-6">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          className="h-11 sm:h-12 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-white/10 disabled:text-text-muted/60 disabled:shadow-none disabled:border disabled:border-white/5 disabled:opacity-100 disabled:cursor-not-allowed disabled:pointer-events-none text-xs sm:text-sm min-h-[44px]"
          disabled={otp.length !== 6 || isPending}
          isLoading={isPending}
        >
          Verify Code
        </Button>

        {(() => {
          const isCooldownActive = requestCooldownRemaining > 0 || resendTimer > 0;
          let cooldownText = 'Resend Code';
          let ariaLabel = 'Resend verification code';
          if (requestCooldownRemaining > 0) {
            cooldownText = `Resend (${formatTime(requestCooldownRemaining)})`;
            ariaLabel = `Resend verification code. Available in ${formatTime(requestCooldownRemaining)}`;
          } else if (resendTimer > 0) {
            cooldownText = `Resend (${resendTimer}s)`;
            ariaLabel = `Resend verification code. Available in ${resendTimer} seconds`;
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
              aria-label={ariaLabel}
              className={`w-full text-center font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple h-11 sm:h-12 text-xs sm:text-sm min-h-[44px] flex items-center justify-center ${
                isCooldownActive
                  ? 'text-text-muted/50 bg-white/5 border border-white/5 cursor-not-allowed'
                  : 'text-accent-purple hover:text-accent-purple-light border border-accent-purple/20 hover:border-accent-purple/40 bg-accent-purple/5 cursor-pointer active:scale-95'
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
