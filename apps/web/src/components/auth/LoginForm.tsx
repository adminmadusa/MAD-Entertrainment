'use client';

import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@mad/ui';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { initializeGoogleIdentity } from '@/utils/google-identity';

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
  mode: 'login' | 'wallet' | 'checkout';
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  requestCooldownRemaining: number;
  verifyCooldownRemaining: number;
  formatTime: (seconds: number) => string;
  error: string;
  isVerificationRequired?: boolean;
  onGuestContinue?: () => void;
  googleLoginIsPending: boolean;
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
  isVerificationRequired,
  onGuestContinue,
  googleLoginIsPending,
}: LoginFormProps) {
  const initializeGoogleSignIn = useCallback(() => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    const btnElement = document.getElementById('google-signin-btn-shared');
    if (typeof window !== 'undefined' && googleObj) {
      try {
        initializeGoogleIdentity(
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google_client_id_placeholder'
        );

        if (btnElement && btnElement.innerHTML === '') {
          googleObj.accounts.id.renderButton(btnElement, {
            theme: 'filled_dark',
            size: 'large',
            width: '100%',
            shape: 'pill',
            text: mode === 'checkout' ? 'continue_with' : 'signin_with',
          });
        }
      } catch (err) {
        console.error('Failed to initialize Google login button:', err);
      }
    }
  }, [mode]);

  useEffect(() => {
    let active = true;
    const loadGsi = async () => {
      try {
        await loadScriptOnce('https://accounts.google.com/gsi/client');
        if (active) {
          setTimeout(() => {
            if (active) initializeGoogleSignIn();
          }, 50);
        }
      } catch (err) {
        console.error('Failed to load Google script in shared auth form:', err);
      }
    };
    loadGsi();
    return () => {
      active = false;
    };
  }, [initializeGoogleSignIn]);

  const isCheckout = mode === 'checkout';

  return (
    <div className="space-y-4 sm:space-y-6">
      {mode !== 'login' && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
            {mode === 'wallet' ? 'Get Your Tickets' : 'Welcome Back'}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {mode === 'wallet'
              ? 'Sign in using the email used during booking.'
              : "Enter your email address and we'll send a verification code to securely access your bookings."}
          </p>
          {mode === 'wallet' && (
            <p className="text-text-muted text-xs mt-2 leading-relaxed">
              We'll send a secure verification code to retrieve your tickets.
            </p>
          )}
        </div>
      )}

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

      {isVerificationRequired && (
        <div 
          role="alert"
          aria-live="polite"
          className="p-5 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-center space-y-2 shadow-glow-sm animate-in fade-in duration-300"
        >
          <h3 className="text-accent-purple-light font-extrabold text-sm tracking-wide">
            Booking Found
          </h3>
          <p className="text-text-secondary text-xs leading-relaxed">
            Enter the email address used during purchase.
          </p>
          <p className="text-text-muted text-[10px] leading-relaxed">
            We'll send you a verification code.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className={isCheckout ? 'flex gap-2' : 'space-y-4 sm:space-y-5'}>
        {isCheckout ? (
          <>
            <input
              id="checkout-login-email"
              type="email"
              required
              autoComplete="email"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              disabled={requestCooldownRemaining > 0}
              isLoading={isPending}
            >
              {requestCooldownRemaining > 0 ? `Request Code (${formatTime(requestCooldownRemaining)})` : 'Send Code'}
            </Button>
          </>
        ) : (
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
        )}
      </form>

      <p className="text-[11px] text-text-muted text-center leading-normal">
        By continuing, you agree to our{' '}
        <Link href="/legal/terms" className="text-accent-purple hover:underline font-semibold">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="text-accent-purple hover:underline font-semibold">
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
          id="google-signin-btn-shared"
          className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
        />
        {googleLoginIsPending && (
          <p className="text-center text-xs text-purple-300/80 animate-pulse mt-2">
            Signing in with Google...
          </p>
        )}
      </div>

      {/* Checkout Guest continue option */}
      {isCheckout && onGuestContinue && (
        <div className="pt-2 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={onGuestContinue}
            className="text-xs font-semibold text-text-muted hover:text-white transition-colors py-1 inline-block"
          >
            Continue as Guest →
          </button>
        </div>
      )}
    </div>
  );
}
