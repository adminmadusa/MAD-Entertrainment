'use client';

interface CheckoutDesktopOrderBoxProps {
  hasStripeData: boolean;
  isExpired: boolean;
  isFormDisabled: boolean;
  buttonText: string;
}

export function CheckoutDesktopOrderBox({
  hasStripeData,
  isExpired,
  isFormDisabled,
  buttonText,
}: CheckoutDesktopOrderBoxProps) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3">
      {!hasStripeData && (
        <button
          type="submit"
          form="checkout-form"
          disabled={isExpired || isFormDisabled}
          className="hidden lg:block w-full px-6 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-bold text-sm transition-all active:scale-95 shadow-glow disabled:opacity-50 cursor-pointer"
        >
          {buttonText}
        </button>
      )}

      <p className="text-[11px] text-text-muted leading-relaxed text-center">
        By selecting Place Order, you agree to the MAD Entertainment Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
