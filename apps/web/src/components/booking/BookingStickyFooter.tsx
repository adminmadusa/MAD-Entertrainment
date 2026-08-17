'use client';

import { formatMoney } from '@mad/shared';
import { Button } from '@mad/ui';

interface BookingStickyFooterProps {
  ticketsLeft: number;
  subtotal: number;
  onCheckoutSubmit: () => void;
  isPending: boolean;
  currency?: string;
}

export function BookingStickyFooter({
  ticketsLeft,
  subtotal,
  onCheckoutSubmit,
  isPending,
  currency = 'USD',
}: BookingStickyFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl">
      <div className="container-mad max-w-2xl px-4 space-y-3">
        <div className="flex items-center justify-between">
          {ticketsLeft <= 50 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md animate-pulse">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z" />
              </svg>
              Few tickets left
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
              Available
            </span>
          )}
          <div className="text-right">
            <span className="text-lg font-black text-white">{formatMoney(subtotal, currency)}</span>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={onCheckoutSubmit}
          isLoading={isPending}
          className="py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all"
        >
          Check out
        </Button>
      </div>
    </div>
  );
}
