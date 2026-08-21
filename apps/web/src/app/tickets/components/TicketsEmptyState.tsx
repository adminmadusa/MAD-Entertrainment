import React from 'react';

import { Button } from '@mad/ui';

interface TicketsEmptyStateProps {
  onSignIn: () => void;
  onLookup: () => void;
}

export function TicketsEmptyState({ onSignIn, onLookup }: TicketsEmptyStateProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      {/* Card 1: Account Login (Primary) */}
      <div className="p-6 sm:p-8 rounded-2xl glass border border-white/10 flex flex-col justify-between space-y-6 hover:border-accent-purple/40 transition-all duration-300 relative overflow-hidden group">
        <div className="space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🎫
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Have an Account?
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Sign in with Google or Email to instantly view all your tickets, event QR passes, and receipts across any device.
          </p>
        </div>

        <div className="relative z-10 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onSignIn}
            className="w-full py-3 text-xs sm:text-sm font-bold rounded-xl shadow-glow min-h-[44px]"
          >
            Sign In to View All Tickets
          </Button>
        </div>
      </div>

      {/* Card 2: Guest Order Lookup */}
      <div className="p-6 sm:p-8 rounded-2xl glass border border-white/10 flex flex-col justify-between space-y-6 hover:border-white/20 transition-all duration-300 relative overflow-hidden group">
        <div className="space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🔍
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Guest Order Lookup
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Purchased tickets as a guest without creating an account? Enter your booking reference number or payment ID to retrieve your passes.
          </p>
        </div>

        <div className="relative z-10 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onLookup}
            className="w-full py-3 text-xs sm:text-sm font-bold rounded-xl border border-white/15 text-white hover:bg-white/5 min-h-[44px]"
          >
            Lookup Booking Reference
          </Button>
        </div>
      </div>
    </div>
  );
}
