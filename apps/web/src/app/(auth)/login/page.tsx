'use client';

import { Button } from '@mad/ui';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';

import { extractApiError } from '@/lib/api/client';
import {
  publicRequestMagicLink,
  publicVerifyMagicLinkOrOTP,
  publicGoogleLogin,
} from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { AuthResponse, MagicLinkRequestResponse } from '@/types/auth';

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

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  
  // Auth query token (from magic link click redirect)
  const queryToken = searchParams.get('token');

  // Core Login State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request'); // request email vs verify OTP
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  // Resend code countdown timer
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Google GSI refs to prevent double initialization & render loops
  const googleCallbackRef = useRef<(response: GoogleCredentialResponse) => void>(() => {});
  const isInitializedRef = useRef(false);

  // Redirect authenticated users to dashboard automatically
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Start resend code timer
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

  // Request Magic Link / OTP Email
  const requestMagicLinkMutation = useMutation<MagicLinkRequestResponse, Error, void>({
    mutationFn: () => publicRequestMagicLink(email),
    onSuccess: (res) => {
      setStep('verify');
      setInfoMessage(res.message || 'Verification email dispatched. Please check your inbox.');
      setError('');
      startTimer();
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Failed to request login link. Please try again.');
    },
  });

  // Verify OTP / Magic Link Token
  const verifyMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (tokenOrOtp: string) =>
      publicVerifyMagicLinkOrOTP({
        token: tokenOrOtp.length > 6 ? tokenOrOtp : undefined,
        otp: tokenOrOtp.length === 6 ? tokenOrOtp : undefined,
        email: tokenOrOtp.length === 6 ? email : undefined,
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push('/dashboard');
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Invalid or expired credentials. Please request a new link.');
    },
  });

  // Google OAuth Login
  const googleLoginMutation = useMutation<AuthResponse, Error, string>({
    mutationFn: (idToken: string) => publicGoogleLogin(idToken),
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push('/dashboard');
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      setError(apiErr.message || 'Google authentication failed. Please try again.');
    },
  });

  // Update Google callback ref when mutation reference changes
  useEffect(() => {
    googleCallbackRef.current = (response: GoogleCredentialResponse) => {
      if (response?.credential) {
        googleLoginMutation.mutate(response.credential);
      }
    };
  }, [googleLoginMutation]);

  // ─── Automatic Magic Link Click Handlers ──────────────────

  useEffect(() => {
    if (queryToken) {
      setInfoMessage('Verifying magic login link...');
      verifyMutation.mutate(queryToken);
    }
  }, [queryToken, verifyMutation]);

  // ─── Google OAuth Identity Services Integration ────────────

  const handleGoogleCredentialResponse = useCallback((response: GoogleCredentialResponse) => {
    googleCallbackRef.current(response);
  }, []);

  const initializeGoogleSignIn = useCallback(() => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    const btnElement = document.getElementById('google-signin-btn');
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
          googleObj.accounts.id.renderButton(
            btnElement,
            {
              theme: 'filled_dark',
              size: 'large',
              width: '100%',
              shape: 'pill',
              text: 'signin_with',
            }
          );
        }
      } catch (err) {
        console.error('Failed to initialize Google login button:', err);
      }
    }
  }, [handleGoogleCredentialResponse]);

  // Re-trigger google button initialization when loading/rendering changes
  useEffect(() => {
    const googleObj = (window as unknown as { google?: GoogleIdentity }).google;
    if (typeof window !== 'undefined' && googleObj && step === 'request') {
      initializeGoogleSignIn();
    }
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

  const handleBackToLogin = () => {
    setStep('request');
    setError('');
    setInfoMessage('');
    setOtp('');
  };

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic script loading for Google Identity Services API */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleSignIn}
      />

      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-md relative z-10 w-full px-4">
        <div className="glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl transition-all duration-500 hover:border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              {step === 'request' ? 'Welcome Back' : 'Verify Passcode'}
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              {step === 'request'
                ? 'Sign in passwordlessly using Google or an Email Magic Link.'
                : `We've sent a verification link and passcode to your email.`}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in zoom-in duration-300">
              {infoMessage}
            </div>
          )}

          {/* SCREEN 1: Request Magic Link Form */}
          {step === 'request' && (
            <div className="space-y-6">
              <form onSubmit={handleSubmitEmail} className="space-y-5">
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
                  isLoading={requestMagicLinkMutation.isPending}
                >
                  Send Login Link
                </Button>
              </form>

              {/* Styled Divider */}
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-border-subtle/40" />
                <span className="mx-4 text-xs font-bold text-text-muted/50 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-border-subtle/40" />
              </div>

              {/* Google OAuth Login Button Container */}
              <div className="space-y-3">
                <div 
                  id="google-signin-btn" 
                  className="w-full min-h-[44px] flex justify-center items-center overflow-hidden hover:opacity-90 active:scale-98 transition-all duration-200"
                />
                {googleLoginMutation.isPending && (
                  <p className="text-center text-xs text-purple-300/80 animate-pulse mt-2">
                    Securing secure Google session...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 2: OTP Passcode Input Form */}
          {step === 'verify' && (
            <form onSubmit={handleSubmitOtp} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="otp" className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1 block text-center">
                  6-Digit Passcode
                </label>
                
                {/* Unified Monospace centered input for pristine responsiveness */}
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
                  className="w-full text-center text-3xl font-black bg-white/5 border border-border-subtle rounded-2xl py-4 text-white placeholder:text-text-muted/15 focus:outline-none focus:border-accent-purple/60 focus:ring-1 focus:ring-accent-purple/60 transition-all duration-300 tracking-[0.6em] pl-[0.6em] font-mono"
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  className="py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-accent-purple/20 hover:shadow-accent-purple/40 active:scale-95 transition-all duration-200"
                  isLoading={verifyMutation.isPending}
                >
                  Verify Code
                </Button>

                <div className="flex justify-between items-center text-xs px-1 pt-1">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-text-muted hover:text-white transition-colors duration-200"
                  >
                    ← Back to Sign In
                  </button>

                  {resendTimer > 0 ? (
                    <span className="text-text-muted/60">
                      Resend link in <span className="font-semibold text-purple-300">{resendTimer}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestMagicLinkMutation.mutate()}
                      disabled={requestMagicLinkMutation.isPending}
                      className="text-accent-purple hover:text-accent-purple-light font-semibold transition-colors duration-200 disabled:opacity-50"
                    >
                      Resend Link
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Branded Footer Link */}
          <div className="mt-8 text-center border-t border-border-subtle/30 pt-6">
            <p className="text-text-muted text-xs">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-accent-purple hover:text-accent-purple-light hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-accent-purple hover:text-accent-purple-light hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-purple-300 text-sm animate-pulse">Loading sign in...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
