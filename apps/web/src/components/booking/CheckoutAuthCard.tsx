'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';

export function CheckoutAuthCard() {
  const { user, logout, isAuthenticated } = useAuth();
  
  // Local UX Flow State
  const [isGuestBypassed, setIsGuestBypassed] = useState(false);

  const handleGuestBypass = () => {
    setIsGuestBypassed(true);
  };

  const handleResetBypass = () => {
    setIsGuestBypassed(false);
  };

  const handleLogoutClick = async () => {
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

      <AuthForm
        mode="checkout"
        onGuestContinue={handleGuestBypass}
        onSuccess={() => {
          setIsGuestBypassed(false);
        }}
      />
    </div>
  );
}
