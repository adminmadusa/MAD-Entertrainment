'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useAdminAuth } from '@/hooks/use-admin-auth.hook';
import { adminLogin } from '@/lib/api/admin/auth.service';
import { extractApiError } from '@/lib/api/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, setAuth } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminLogin({ email: email.trim(), password });
      setAuth(result.token, result.admin);
      router.replace('/dashboard');
    } catch (err) {
      const { message } = extractApiError(err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Don't flash the login form while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4">
      {/* ── Background Effects ─────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-purple/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-pink/6 rounded-full blur-[100px]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* ── Login Card ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl border border-border-subtle p-8 md:p-10 shadow-card">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow mb-4">
              <span className="text-white font-black text-xl">M</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Admin Portal
            </h1>
            <p className="text-text-muted text-sm mt-1">
              MAD Entertrainment
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
                role="alert"
              >
                <ErrorIcon />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="text-sm font-medium text-text-secondary block"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                  <EmailIcon />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@madentertrainment.com"
                  className={[
                    'w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium',
                    'bg-background-card border transition-all duration-200 outline-none',
                    'text-text-primary placeholder:text-text-muted',
                    error
                      ? 'border-error/50 focus:border-error'
                      : 'border-border-subtle focus:border-accent-purple focus:shadow-glow-sm',
                  ].join(' ')}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="text-sm font-medium text-text-secondary block"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                  <LockIcon />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={[
                    'w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium',
                    'bg-background-card border transition-all duration-200 outline-none',
                    'text-text-primary placeholder:text-text-muted',
                    error
                      ? 'border-error/50 focus:border-error'
                      : 'border-border-subtle focus:border-accent-purple focus:shadow-glow-sm',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              id="admin-login-submit"
              type="submit"
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.01 } : undefined}
              whileTap={!submitting ? { scale: 0.99 } : undefined}
              className={[
                'w-full py-3.5 rounded-xl font-bold text-white text-base',
                'btn-gradient shadow-glow-sm transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
              ].join(' ')}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Footer note */}
          <p className="text-center text-text-muted text-xs mt-6">
            Access restricted to authorised personnel only.
            <br />
            Run{' '}
            <code className="bg-background-card px-1.5 py-0.5 rounded text-accent-purple-light font-mono text-[11px]">
              npm run seed:admin
            </code>{' '}
            to create first admin.
          </p>
        </div>

        {/* Back to site */}
        <p className="text-center mt-6">
          <a
            href="http://localhost:3000"
            className="text-text-muted text-sm hover:text-text-secondary transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeftIcon />
            Back to site
          </a>
        </p>
      </motion.div>
    </main>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
