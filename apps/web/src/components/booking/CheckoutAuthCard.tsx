'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestMagicLink,
  publicVerifyMagicLinkOrOTP,
  publicGoogleLogin,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { AuthResponse, MagicLinkRequestResponse } from '@/types/auth';
import { Button } from '@mad/ui';

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

export function CheckoutAuthCard() {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // Local UX Flow State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isGuestBypassed, setIsGuestBypassed] = useState(false);

  // Countdown timer for code resend
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Mutations ─────────────────────────────────────────────

  const requestMagicLinkMutation = useMutation<MagicLinkRequestResponse, Error, void>({
    mutationFn: () => publicRequestMagicLink(email),
    onSuccess: (res) => {
      setStep('verify');
      setInfoMessage(res.message || 'Passcode dispatched. Please check your inbox.');
      setError('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Failed to request login link. Please try again.');
    },
  });

  const verifyMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (tokenOrOtp: string) =>
      publicVerifyMagicLinkOrOTP({
        token: tokenOrOtp.length > 6 ? tokenOrOtp : undefined,
        otp: tokenOrOtp.length === 6 ? tokenOrOtp : undefined,
        email: tokenOrOtp.length === 6 ? email : undefined,
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      setIsGuestBypassed(false);
      setStep('request');
      setInfoMessage('Successfully authenticated!');
      setError('');
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Invalid or expired passcode.');
    },
  });

  const googleLoginMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (idToken: string) => publicGoogleLogin(idToken),
    onSuccess: (data) => {
      login(data.token, data.user);
      setIsGuestBypassed(false);
      setStep('request');
      setInfoMessage('Successfully authenticated with Google!');
      setError('');
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  // ─── Google OAuth Identity Services Integration ────────────

  const handleGoogleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
    if (response?.credential) {
      googleLoginMutation.mutate(response.credential);
    }
  }, [googleLoginMutation]);

  const initializeGoogleSignIn = useCallback(() => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    const btnElement = document.getElementById('checkout-google-signin-btn');
    if (typeof window !== 'undefined' && googleObj && btnElement) {
      try {
        googleObj.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google_client_id_placeholder',
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        googleObj.accounts.id.renderButton(
          btnElement,
          {
            theme: 'filled_dark',
            size: 'large',
            width: '100%',
            shape: 'pill',
            text: 'continue_with',
          }
        );
      } catch (err) {
        console.error('Failed to initialize Google login button inside checkout:', err);
      }
    }
  }, [handleGoogleCredentialResponse]);

  // Load Google SDK script asynchronously on mount or state changes
  useEffect(() => {
    let active = true;
    const loadGsi = async () => {
      try {
        await loadScriptOnce('https://accounts.google.com/gsi/client');
        if (active && !isAuthenticated && step === 'request' && !isGuestBypassed) {
          initializeGoogleSignIn();
        }
      } catch (err) {
        console.error('Failed to load Google script in checkout auth:', err);
      }
    };
    loadGsi();
    return () => {
      active = false;
    };
  }, [isAuthenticated, step, isGuestBypassed, initializeGoogleSignIn]);

  // Form Handlers
  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    requestMagicLinkMutation.mutate();
  };

  const handleSubmitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otp.trim().replace(/\s/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter a valid 6-digit passcode');
      return;
    }
    verifyMutation.mutate(cleanOtp);
  };

  const handleBackToOptions = () => {
    setStep('request');
    setError('');
    setInfoMessage('');
    setOtp('');
  };

  const handleGuestBypass = () => {
    setIsGuestBypassed(true);
    setError('');
    setInfoMessage('');
  };

  const handleResetBypass = () => {
    setIsGuestBypassed(false);
    setError('');
    setInfoMessage('');
  };

  const handleLogoutClick = async () => {
    setError('');
    setInfoMessage('');
    await logout();
  };

  // ─── Case 1: Already Authenticated ─────────────────────────
  if (isAuthenticated && user) {
    return (
      <div className="glass rounded-2xl border border-white/5 p-4 flex flex-wrap justify-between items-center gap-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-semibold text-text-secondary">
            Signed in as <span className="text-white font-bold">{user.email}</span>
          </p>
        </div>
        <button
          onClick={handleLogoutClick}
          className="text-xs font-bold text-accent-purple hover:text-accent-purple-light hover:underline transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  // ─── Case 2: Bypassed Checkout As Guest ──────────────────────
  if (isGuestBypassed) {
    return (
      <div className="glass rounded-2xl border border-white/5 p-4 flex flex-wrap justify-between items-center gap-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-text-muted">
            Checking out as <span className="text-white/80 font-bold">Guest</span>
          </p>
          <span className="text-[10px] text-text-muted/40">•</span>
          <p className="text-[10px] text-text-muted/80">Billing form required manually</p>
        </div>
        <button
          onClick={handleResetBypass}
          className="text-xs font-bold text-accent-purple hover:text-accent-purple-light hover:underline transition-colors"
        >
          Sign in for faster checkout
        </button>
      </div>
    );
  }

  // ─── Case 3: Display Authentication Options Card ───────────
  return (
    <div className="glass rounded-2xl border border-white/5 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-400">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white tracking-wide">Sign in for faster checkout</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Access your booking history and auto-fill details automatically.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-[11px] text-red-400 text-center animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-accent-purple/10 border border-accent-purple/30 rounded-xl text-[11px] text-purple-300 text-center animate-in fade-in duration-200">
          {infoMessage}
        </div>
      )}

      {step === 'request' ? (
        <div className="space-y-4">
          {/* Email magic link form */}
          <form onSubmit={handleSubmitEmail} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              className="px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap"
              isLoading={requestMagicLinkMutation.isPending}
            >
              Email Login Link
            </Button>
          </form>

          {/* Stacked Divider */}
          <div className="flex items-center my-1.5">
            <div className="flex-grow border-t border-white/10" />
            <span className="mx-3 text-[9px] font-black text-text-muted/40 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* Google Button */}
          <div className="space-y-2">
            <div 
              id="checkout-google-signin-btn" 
              className="w-full min-h-[40px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
            />
            {googleLoginMutation.isPending && (
              <p className="text-center text-[10px] text-purple-300/80 animate-pulse">
                Securing secure Google session...
              </p>
            )}
          </div>

          {/* Continue as Guest Button */}
          <div className="pt-2 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={handleGuestBypass}
              className="text-xs font-semibold text-text-muted hover:text-white transition-colors py-1 inline-block"
            >
              Continue as Guest →
            </button>
          </div>
        </div>
      ) : (
        /* OTP Verification input */
        <form onSubmit={handleSubmitOtp} className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-2 text-center">
            <label htmlFor="checkout-otp" className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              Enter 6-Digit Passcode
            </label>
            <input
              id="checkout-otp"
              type="text"
              required
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl font-black bg-white/5 border border-white/10 rounded-xl py-2.5 text-white placeholder:text-text-muted/15 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all tracking-[0.4em] pl-[0.4em] font-mono"
            />
          </div>

          <div className="space-y-2.5">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="py-2.5 text-xs font-bold rounded-xl"
              isLoading={verifyMutation.isPending}
            >
              Verify Passcode
            </Button>

            <div className="flex justify-between items-center text-[10px] px-1">
              <button
                type="button"
                onClick={handleBackToOptions}
                className="text-text-muted hover:text-white transition-colors"
              >
                ← Back
              </button>

              {resendTimer > 0 ? (
                <span className="text-text-muted/50">
                  Resend in <span className="font-semibold text-purple-300">{resendTimer}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestMagicLinkMutation.mutate()}
                  disabled={requestMagicLinkMutation.isPending}
                  className="text-accent-purple hover:text-accent-purple-light font-semibold transition-colors disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
