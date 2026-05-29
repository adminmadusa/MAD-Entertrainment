'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get('token');

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center relative overflow-hidden bg-background">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container-mad max-w-md relative z-10 w-full px-4">
        <div className="glass-strong rounded-3xl border border-border-subtle p-8 shadow-2xl transition-all duration-500 hover:border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              Enter your email address and we'll send a verification code to securely access your bookings.
            </p>
          </div>

          <AuthForm mode="login" initialToken={queryToken} />
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
