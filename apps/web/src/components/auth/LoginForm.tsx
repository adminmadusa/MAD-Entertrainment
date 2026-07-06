'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';

import { Button, Alert, FormField, Input } from '@mad/ui';

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
      {requestCooldownRemaining > 0 && (
        <Alert variant="info" role="status" className="animate-in fade-in duration-300">
          Verification code sent. New code available in {formatTime(requestCooldownRemaining)}.
        </Alert>
      )}
      {verifyCooldownRemaining > 0 && (
        <Alert variant="danger" className="animate-in fade-in duration-300">
          <div className="space-y-1">
            <p className="font-bold">For your security, verification attempts are temporarily paused.</p>
            <p>Please try again in:</p>
            <p className="font-mono text-lg font-black tracking-wider text-amber-400">
              {formatTime(verifyCooldownRemaining)}
            </p>
          </div>
        </Alert>
      )}
      {verifyCooldownRemaining <= 0 && error && (
        <Alert variant="danger" className="animate-in fade-in duration-300">
          {error}
        </Alert>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>

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
