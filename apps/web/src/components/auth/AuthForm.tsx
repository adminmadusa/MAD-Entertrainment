'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestVerificationCode,
  publicVerifyVerificationCodeOrOTP,
  publicGoogleLogin,
  publicUpdateProfile,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { AuthResponse, VerificationCodeRequestResponse, AuthUser } from '@/types/auth';
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
  isVerificationRequired?: boolean;
  bookingReference?: string;
  initialEmail?: string;
}

export function AuthForm({
  mode,
  onSuccess,
  onGuestContinue,
  className = '',
  isVerificationRequired,
  bookingReference,
  initialEmail,
}: AuthFormProps) {
  const { login, logout, token, setOnboardingRequired, onboardingRequired } = useAuth();

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [cooldownExpiry, setCooldownExpiry] = useState<number | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const triggerCooldown = useCallback((retryAfterSeconds: number) => {
    const proposedExpiry = Date.now() + retryAfterSeconds * 1000;
    const storedExpiry = localStorage.getItem('mad_otp_cooldown_expiry');
    const existingExpiry = storedExpiry ? Number(storedExpiry) : 0;
    const finalExpiry = Math.max(existingExpiry, proposedExpiry);

    localStorage.setItem('mad_otp_cooldown_expiry', String(finalExpiry));
    setCooldownExpiry(finalExpiry);
    setCooldownRemaining(Math.ceil((finalExpiry - Date.now()) / 1000));
  }, []);

  // Hydrate on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedExpiry = localStorage.getItem('mad_otp_cooldown_expiry');
      if (storedExpiry) {
        const expiry = Number(storedExpiry);
        if (expiry > Date.now()) {
          setCooldownExpiry(expiry);
          setCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
        }
      }
    }
  }, []);

  // Set interval timer
  useEffect(() => {
    if (!cooldownExpiry) {
      setCooldownRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.ceil((cooldownExpiry - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        setCooldownExpiry(null);
        localStorage.removeItem('mad_otp_cooldown_expiry');
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownExpiry]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mad_otp_cooldown_expiry') {
        if (e.newValue) {
          const expiry = Number(e.newValue);
          if (expiry > Date.now()) {
            setCooldownExpiry(expiry);
            setCooldownRemaining(Math.ceil((expiry - Date.now()) / 1000));
          } else {
            setCooldownExpiry(null);
            setCooldownRemaining(0);
          }
        } else {
          setCooldownExpiry(null);
          setCooldownRemaining(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Core Authentication States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'onboard'>('request');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  // Onboarding Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [onboardError, setOnboardError] = useState('');

  // Auto transition to onboard step if authenticated but profile is incomplete
  // NOTE (code-review watch item): step is intentionally excluded from deps to avoid
  // re-triggering when the user navigates between verify/request. The effect should
  // only fire when auth state (token/onboardingRequired) changes.
  useEffect(() => {
    if (token && onboardingRequired && step !== 'onboard') {
      setStep('onboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, onboardingRequired]);

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

  // Request verification code / OTP passcode dispatch
  const requestVerificationCodeMutation = useMutation<VerificationCodeRequestResponse, Error, void>({
    mutationFn: () => publicRequestVerificationCode(email),
    onSuccess: (res) => {
      setStep('verify');
      setInfoMessage(res.message || 'Verification passcode dispatched. Please check your inbox.');
      setError('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'RATE_LIMIT_EXCEEDED') {
        triggerCooldown(apiErr.retryAfter ?? 60);
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
        email,
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      setOnboardingRequired(!!data.onboardingRequired);
      setError('');
      setOtp('');
      setInfoMessage('');
      if (data.onboardingRequired) {
        setStep('onboard');
      } else {
        if (onSuccess) {
          onSuccess(data);
        }
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'RATE_LIMIT_EXCEEDED') {
        triggerCooldown(apiErr.retryAfter ?? 60);
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
      setInfoMessage('Successfully authenticated with Google!');
      if (data.onboardingRequired) {
        setStep('onboard');
      } else {
        if (onSuccess) {
          onSuccess(data);
        }
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  // Update Profile Onboarding Mutation
  const updateProfileMutation = useMutation<AuthUser, Error, { firstName: string; lastName: string; mobileNumber?: string }>({
    mutationFn: (payload) => publicUpdateProfile(payload),
    onSuccess: (updatedUser) => {
      login(token!, updatedUser);
      setOnboardingRequired(false);
      if (onSuccess) {
        onSuccess({ token: token!, user: updatedUser });
      }
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setOnboardError(apiErr.message || 'Profile completion failed. Please try again.');
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
    requestVerificationCodeMutation.mutate();
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

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');

    if (updateProfileMutation.isPending) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName) {
      setOnboardError('First name is required');
      return;
    }
    if (!trimmedLastName) {
      setOnboardError('Last name is required');
      return;
    }

    const trimmedMobile = mobileNumber.trim();
    if (trimmedMobile && !/^\+[1-9]\d{1,14}$/.test(trimmedMobile)) {
      setOnboardError('Mobile number must be in E.164 format (e.g. +919876543210)');
      return;
    }

    updateProfileMutation.mutate({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      mobileNumber: trimmedMobile || undefined,
    });
  };

  const handleOnboardingCancel = () => {
    logout();
    setStep('request');
    setFirstName('');
    setLastName('');
    setMobileNumber('');
    setOnboardError('');
  };

  const isCheckout = mode === 'checkout';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Banners */}
      {(() => {
        if (cooldownRemaining > 0) {
          return (
            <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300 space-y-1">
              <p className="font-bold">For your security, we've temporarily paused verification requests.</p>
              <p>You can request a new code in:</p>
              <p className="font-mono text-lg font-black tracking-wider text-amber-400">
                {formatTime(cooldownRemaining)}
              </p>
            </div>
          );
        }
        if (error) {
          return (
            <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300">
              {error}
            </div>
          );
        }
        return null;
      })()}

      {infoMessage && (
        <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300">
          {infoMessage}
        </div>
      )}

      {/* SCREEN 1: Request OTP Form */}
      {step === 'request' && (
        <div className="space-y-6">
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

          <form onSubmit={handleSubmitEmail} className={isCheckout ? 'flex gap-2' : 'space-y-5'}>
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
                  className="flex-grow bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-base lg:text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
                />
                 <Button
                  type="submit"
                  variant="primary"
                  className="px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap"
                  disabled={cooldownRemaining > 0}
                  isLoading={requestVerificationCodeMutation.isPending}
                >
                  {cooldownRemaining > 0 ? `Request Code (${formatTime(cooldownRemaining)})` : 'Send Code'}
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
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3.5 text-base lg:text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
                  disabled={cooldownRemaining > 0}
                  isLoading={requestVerificationCodeMutation.isPending}
                >
                  {cooldownRemaining > 0 ? `Request Code (${formatTime(cooldownRemaining)})` : 'Continue with Email'}
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
          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-border-subtle/40" />
            <span className="mx-4 text-xs font-bold text-text-muted/50 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border-subtle/40" />
          </div>

          {/* Google SSO button */}
          <div className="space-y-3">
            {cooldownRemaining > 0 ? (
              <Button
                variant="secondary"
                disabled
                fullWidth
                className="py-3.5 rounded-xl font-bold tracking-wide transition-all duration-200"
              >
                Google Login ({formatTime(cooldownRemaining)})
              </Button>
            ) : null}
            <div
              id="google-signin-btn-shared"
              className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
              style={{ display: cooldownRemaining > 0 ? 'none' : 'flex' }}
            />
            {googleLoginMutation.isPending && (
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
              autoComplete="one-time-code"
              enterKeyHint="done"
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
              disabled={cooldownRemaining > 0}
              isLoading={verifyMutation.isPending}
            >
              {cooldownRemaining > 0 ? `Request Code (${formatTime(cooldownRemaining)})` : 'Verify Code'}
            </Button>

            <div className="flex justify-between items-center text-xs px-1 pt-1">
              <button
                type="button"
                onClick={handleBackToOptions}
                className="text-text-muted hover:text-white transition-colors duration-200"
              >
                ← Edit email
              </button>

              {(() => {
                if (cooldownRemaining > 0) {
                  return (
                    <span className="text-text-muted/60">
                      Resend code in <span className="font-semibold text-purple-300">{formatTime(cooldownRemaining)}</span>
                    </span>
                  );
                }
                if (resendTimer > 0) {
                  return (
                    <span className="text-text-muted/60">
                      Resend code in <span className="font-semibold text-purple-300">{resendTimer}s</span>
                    </span>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={() => requestVerificationCodeMutation.mutate()}
                    disabled={requestVerificationCodeMutation.isPending || cooldownRemaining > 0}
                    className="text-accent-purple hover:text-accent-purple-light font-semibold transition-colors duration-200 disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                );
              })()}
            </div>
          </div>
        </form>
      )}

      {/* SCREEN 3: Profile Onboarding Form */}
      {step === 'onboard' && (
        <form onSubmit={handleOnboardingSubmit} className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
            <p className="text-xs text-text-muted mt-1">Tell us your name before accessing your tickets.</p>
          </div>

          {onboardError && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in duration-300">
              {onboardError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                disabled={updateProfileMutation.isPending}
                enterKeyHint="next"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                disabled={updateProfileMutation.isPending}
                enterKeyHint="next"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="mobileNumber" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                type="tel"
                disabled={updateProfileMutation.isPending}
                enterKeyHint="done"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-muted/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 transition-all duration-300"
              />
              <p className="text-[10px] text-text-muted/65 ml-1">Include country code (e.g. +91)</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              className={isCheckout ? 'py-2.5 text-xs font-bold rounded-xl' : 'py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200'}
              disabled={updateProfileMutation.isPending}
              isLoading={updateProfileMutation.isPending}
            >
              Continue
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleOnboardingCancel}
                disabled={updateProfileMutation.isPending}
                className="text-xs text-text-muted hover:text-white transition-colors duration-200 py-2"
              >
                Cancel and Log Out
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
