'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';

import { Button, FormField, Input } from '@mad/ui';

import { useGoogleSignIn } from './hooks/useGoogleSignIn';


export interface LoginFormProps {
  mode: 'login';
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  requestCooldownRemaining: number;
  verifyCooldownRemaining: number;
  formatTime: (seconds: number) => string;
  error: string;
  googleLoginIsPending: boolean;
  onGoogleLoginSuccess: (credential: string) => void;
  readonlyEmail?: boolean;
}

export function LoginForm({
  mode,
  email,
  setEmail,
  onSubmit,
  isPending,
  requestCooldownRemaining,
  verifyCooldownRemaining,
  formatTime,
  error,
  googleLoginIsPending,
  onGoogleLoginSuccess,
  readonlyEmail,
}: LoginFormProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const { gsiLoaded, renderButton } = useGoogleSignIn({
    onSuccess: onGoogleLoginSuccess,
  });

  useEffect(() => {
    if (gsiLoaded && googleBtnRef.current) {
      renderButton(googleBtnRef.current);
    }
  }, [gsiLoaded, renderButton]);

  // mode is always 'login' — retained as prop for future extensibility and test compatibility
  void mode;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight leading-7">
          {readonlyEmail ? 'Verify Account' : 'Sign In'}
        </h2>
        <p className="text-xs text-text-secondary leading-5 font-normal">
          {readonlyEmail ? 'A 6-digit verification code will be sent to your email.' : 'Enter your email to continue'}
        </p>
      </div>

      {/* Cooldown Banners */}
      {requestCooldownRemaining > 0 && (
        <p role="status" className="text-xs text-center text-purple-300/80 animate-in fade-in duration-300">
          Verification code sent. New code available in {formatTime(requestCooldownRemaining)}.
        </p>
      )}
      {verifyCooldownRemaining > 0 && (
        <p role="alert" className="text-xs text-center text-amber-400 font-semibold animate-in fade-in duration-300">
          For your security, verification attempts are temporarily paused.<br />
          Please try again in: <span className="font-mono font-black tracking-wider">{formatTime(verifyCooldownRemaining)}</span>
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-4 sm:space-y-5">
          <FormField label="Email Address" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => !readonlyEmail && setEmail(e.target.value)}
              readOnly={readonlyEmail}
              disabled={isPending || readonlyEmail}
              className={readonlyEmail ? 'opacity-85 cursor-not-allowed bg-white/5' : ''}
              placeholder="you@example.com"
            />
            {verifyCooldownRemaining <= 0 && error && (
              <p role="alert" className="mt-1.5 text-xs text-red-400 animate-in fade-in duration-200">
                {error}
              </p>
            )}
          </FormField>

          {(() => {
            let label = readonlyEmail ? 'Send Verification Code' : 'Continue with Email';
            if (requestCooldownRemaining > 0) {
              label = `Request Code (${formatTime(requestCooldownRemaining)})`;
            }
            return (
              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px]"
                disabled={requestCooldownRemaining > 0}
                isLoading={isPending}
              >
                {label}
              </Button>
            );
          })()}
        </div>
      </form>

      <p className="text-[11px] text-text-muted text-center leading-normal">
        By continuing, you agree to our{' '}
        <Link href="/legal/terms" className="text-accent-purple hover:underline font-semibold" aria-label="Terms of Service (opens in same tab)">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="text-accent-purple hover:underline font-semibold" aria-label="Privacy Policy (opens in same tab)">
          Privacy Policy
        </Link>
        .
      </p>

      {!readonlyEmail && (
        <>
          {/* Stacked Divider */}
          <div className="flex items-center my-4 sm:my-6">
            <div className="flex-grow border-t border-border-subtle" />
            <span className="mx-4 text-xs font-bold text-text-muted uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border-subtle" />
          </div>

          {/* Google SSO button */}
          <div className="space-y-3">
            <div
              ref={googleBtnRef}
              id="google-signin-btn-shared"
              className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
            />
            {googleLoginIsPending && (
              <p className="text-center text-xs text-purple-300/80 animate-pulse mt-2">
                Signing in with Google...
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
