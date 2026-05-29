'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestMagicLink,
  publicVerifyMagicLinkOrOTP,
  publicGoogleLogin,
  publicCheckEmail,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { AuthResponse, MagicLinkRequestResponse } from '@/types/auth';
import { Button } from '@mad/ui';

// ─── Google SSO Type Definitions ─────────────────────────────

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

export interface AuthFormProps {
  mode: 'login' | 'wallet' | 'checkout';
  onSuccess?: (data: AuthResponse) => void;
  onGuestContinue?: () => void;
  className?: string;

  const { login } = useAuth();

  // Core Authentication States
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'register' | 'verify'>('request');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Countdown timer state for code resending
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Google GSI reference markers to prevent concurrent initializations
  const googleCallbackRef = useRef<(response: GoogleCredentialResponse) => void>(() => {});
  const isInitializedRef = useRef(false);

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

  // ─── React Query Mutations ───────────────────────────────────

  // Check if Email exists (strictly login mode registration discovery)
  const checkEmailMutation = useMutation<{ exists: boolean }, Error, string>({
    mutationFn: (emailStr: string) => publicCheckEmail(emailStr),
    onSuccess: (data) => {
      if (data.exists) {
        requestMagicLinkMutation.mutate();
      } else {
        setStep('register');
        setInfoMessage('');
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Failed to verify email. Please try again.');
    },
  });

  // Request Magic Link / OTP Passcode Dispatch
  const requestMagicLinkMutation = useMutation<MagicLinkRequestResponse, Error, void>({
    mutationFn: () =>
      publicRequestMagicLink(
        email,
        mode === 'login' && step === 'register' ? { firstName, lastName, mobileNumber } : undefined
      ),
    onSuccess: (res) => {
      setStep('verify');
      setInfoMessage(res.message || 'Verification passcode dispatched. Please check your inbox.');
      setError('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Failed to send verification code. Please try again.');
    },
  });

  // Verify OTP / Clicked URL Link Token
  const verifyMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (tokenOrOtp: string) =>
      publicVerifyMagicLinkOrOTP({
        token: tokenOrOtp.length > 6 ? tokenOrOtp : undefined,
        otp: tokenOrOtp.length === 6 ? tokenOrOtp : undefined,
        email: tokenOrOtp.length === 6 ? email : undefined,
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      setError('');
      setOtp('');
      setInfoMessage('');
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Invalid verification code. Please request a new code.');
    },
  });

  // Google Single Tap OAuth Verification
  const googleLoginMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (idToken: string) => publicGoogleLogin(idToken),
    onSuccess: (data) => {
      login(data.token, data.user);
      setError('');
      setInfoMessage('Successfully authenticated with Google!');
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  // Synchronize dynamic callback reference
  useEffect(() => {
    googleCallbackRef.current = (response: GoogleCredentialResponse) => {
      if (response?.credential) {
        googleLoginMutation.mutate(response.credential);
      }
    };
  }, [googleLoginMutation]);

  const handleGoogleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
    googleCallbackRef.current(response);
  }, []);

  const initializeGoogleSignIn = useCallback(() => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    const btnElement = document.getElementById('google-signin-btn-shared');
    if (typeof window !== 'undefined' && googleObj) {
      try {
        if (!isInitializedRef.current) {
          googleObj.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google_client_id_placeholder',
            callback: handleGoogleCredentialResponse,
            auto_select: false,
          });
          isInitializedRef.current = true;
        }

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
  }, [handleGoogleCredentialResponse, mode]);

  useEffect(() => {
    let active = true;
    const loadGsi = async () => {
      try {
        await loadScriptOnce('https://accounts.google.com/gsi/client');
        if (active && step === 'request') {
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
  }, [step, initializeGoogleSignIn]);

  // Form Submissions
  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (mode === 'login') {
      checkEmailMutation.mutate(email);
    } else {
      requestMagicLinkMutation.mutate();
    }
  };

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and Last names are required');
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = pastedText.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitized);
  };

  const handleBackToOptions = () => {
    setStep('request');
    setError('');
    setInfoMessage('');
    setOtp('');
  };

  const isCheckout = mode === 'checkout';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Banners */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300">
          {infoMessage}
        </div>
      )}

      {/* SCREEN 1: Request OTP Form */}
      {step === 'request' && (
        <div className="space-y-6">
          <form onSubmit={handleSubmitEmail} className={isCheckout ? 'flex gap-2' : 'space-y-5'}>
            {isCheckout ? (
              <>
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
                  isLoading={checkEmailMutation.isPending || requestMagicLinkMutation.isPending}
                >
                  Email Login Link
                </Button>
              </>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
                  isLoading={checkEmailMutation.isPending || requestMagicLinkMutation.isPending}
                >
                  Continue with Email
                </Button>
              </div>
            )}
          </form>

          {/* Stacked Divider */}
          <div className="flex items-center my-6">
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
            {googleLoginMutation.isPending && (
              <p className="text-center text-xs text-purple-300/80 animate-pulse mt-2">
                Securing secure Google session...
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
      )}

      {/* SCREEN 1.5: Register Profile Overlay */}
      {step === 'register' && (
        <form onSubmit={handleSubmitRegister} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="mobileNumber" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Mobile Number (Optional)
              </label>
              <input
                id="mobileNumber"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
              isLoading={requestMagicLinkMutation.isPending}
            >
              Create Account
            </Button>
            <button
              type="button"
              onClick={handleBackToOptions}
              className="w-full text-center text-xs text-text-muted hover:text-white transition-colors duration-200 py-2"
            >
              ← Use a different email
            </button>
          </div>
        </form>
      )}

      {/* SCREEN 2: Verification Input Form */}
      {step === 'verify' && (
        <form onSubmit={handleSubmitOtp} className="space-y-6">
          <div className="text-center text-sm text-text-muted flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{email}</span>
              <button
                type="button"
                onClick={handleBackToOptions}
                className="text-text-muted hover:text-white transition-colors duration-200 hover:scale-110 active:scale-95"
                title="Edit Email"
              >
                ✏️
              </button>
            </div>
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
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              onPaste={handlePaste}
              placeholder="000000"
              className={`w-full text-center font-black bg-white/5 border border-border-subtle rounded-2xl text-white placeholder:text-text-muted/15 focus:outline-none focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/60 transition-all duration-300 font-mono ${
                isCheckout ? 'text-2xl py-2.5 tracking-[0.4em] pl-[0.4em]' : 'text-3xl py-4 tracking-[0.6em] pl-[0.6em]'
              }`}
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              className={isCheckout ? 'py-2.5 text-xs font-bold rounded-xl' : 'py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200'}
              isLoading={verifyMutation.isPending}
            >
              Verify Code
            </Button>

            <div className="flex justify-between items-center text-xs px-1 pt-1">
              <button
                type="button"
                onClick={handleBackToOptions}
                className="text-text-muted hover:text-white transition-colors duration-200"
              >
                ← Edit email
              </button>

              {resendTimer > 0 ? (
                <span className="text-text-muted/60">
                  Resend code in <span className="font-semibold text-purple-300">{resendTimer}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestMagicLinkMutation.mutate()}
                  disabled={requestMagicLinkMutation.isPending}
                  className="text-accent-purple hover:text-accent-purple-light font-semibold transition-colors duration-200 disabled:opacity-50"
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
