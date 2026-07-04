'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';

import { Button } from '@mad/ui';

import { useGoogleSignIn } from './hooks/useGoogleSignIn';

interface GoogleCredentialResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement | null,
    options: {
      theme?: string;
      size?: string;
      width?: string;
      shape?: string;
      text?: string;
    }
  ): void;
}

interface GoogleIdentity {
  accounts: {
    id: GoogleAccountsId;
  };
}

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
      {/* Alert Banners */}
      {(() => {
        if (requestCooldownRemaining > 0) {
          return (
            <div 
              role="status"
              aria-live="polite"
              className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300"
            >
              Verification code sent. New code available in {formatTime(requestCooldownRemaining)}.
            </div>
          );
        }
        if (verifyCooldownRemaining > 0) {
          return (
            <div 
              role="alert"
              aria-live="assertive"
              className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300 space-y-1"
            >
              <p className="font-bold">For your security, verification attempts are temporarily paused.</p>
              <p>Please try again in:</p>
              <p className="font-mono text-lg font-black tracking-wider text-amber-400">
                {formatTime(verifyCooldownRemaining)}
              </p>
            </div>
          );
        }
        if (error) {
          return (
            <div 
              role="alert"
              aria-live="assertive"
              className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300"
            >
              {error}
            </div>
          );
        }
        return null;
      })()}



      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all duration-300"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            disabled={requestCooldownRemaining > 0}
            isLoading={isPending}
          >
            {requestCooldownRemaining > 0 ? `Request Code (${formatTime(requestCooldownRemaining)})` : 'Continue with Email'}
          </Button>
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

      {/* Stacked Divider */}
      <div className="flex items-center my-4 sm:my-6">
        <div className="flex-grow border-t border-border-subtle/40" />
        <span className="mx-4 text-xs font-bold text-text-muted/50 uppercase tracking-widest">or</span>
        <div className="flex-grow border-t border-border-subtle/40" />
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
    </div>
  );
}
