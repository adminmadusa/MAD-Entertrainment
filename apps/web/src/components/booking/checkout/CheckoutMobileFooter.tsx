'use client';

import { formatMoney } from '@mad/shared';

interface CheckoutMobileFooterProps {
  isModal?: boolean;
  totalAmount: number;
  currency: string;
  hasStripeData: boolean;
  isExpired: boolean;
  isDisabled: boolean;
  buttonText: string;
  isKeyboardOpen: boolean;
}

export function CheckoutMobileFooter({
  isModal,
  totalAmount,
  currency,
  hasStripeData,
  isExpired,
  isDisabled,
  buttonText,
  isKeyboardOpen,
}: CheckoutMobileFooterProps) {
  if (isKeyboardOpen) return null;

  return (
    <div
      className={
        isModal
          ? 'shrink-0 bg-background border-t border-white/10 py-2 px-4 z-30 shadow-2xl lg:hidden'
          : 'fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-white/10 shadow-2xl lg:hidden'
      }
    >
      <div
        className={`container-mad max-w-4xl flex items-center justify-between gap-3 ${
          isModal ? 'py-1' : 'py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <div>
          <div className="text-[9px] text-text-muted font-semibold uppercase tracking-wider">
            Total Amount
          </div>
          <div className="text-white font-black text-base sm:text-lg leading-tight">
            {formatMoney(totalAmount, currency)}
          </div>
        </div>
        {!hasStripeData && (
          <button
            type="submit"
            form="checkout-form"
            disabled={isExpired || isDisabled}
            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50 cursor-pointer"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
