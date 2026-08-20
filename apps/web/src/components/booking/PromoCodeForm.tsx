'use client';

import { Modal } from '@mad/ui';

interface PromoCodeFormProps {
  couponCode: string;
  couponApplied: boolean;
  couponMessage: { type: 'success' | 'error'; text: string } | null;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
  onApplyCoupon: (e: React.FormEvent) => void;
  onRemoveCoupon: () => void;
  onCouponChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PromoCodeForm({
  couponCode,
  couponApplied,
  couponMessage,
  showCelebration,
  setShowCelebration,
  onApplyCoupon,
  onRemoveCoupon,
  onCouponChange,
}: PromoCodeFormProps) {
  return (
    <div className="space-y-1.5">
      <form onSubmit={onApplyCoupon} className="flex gap-2">
        <input
          id="promo-code-input"
          type="text"
          value={couponCode}
          onChange={onCouponChange}
          placeholder="Promo code (optional)"
          aria-label="Promo code"
          className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono uppercase text-white placeholder:text-text-muted placeholder:font-sans focus:outline-none focus:border-accent-purple transition-colors"
        />
        {!couponApplied ? (
          <button
            type="submit"
            disabled={!couponCode.trim()}
            className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 font-semibold text-xs text-white transition-all disabled:opacity-40 cursor-pointer shrink-0"
          >
            Apply
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="h-9 px-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        )}
      </form>

      {/* Coupon Applied Details Block */}
      {couponApplied && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-start gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-[11px] leading-tight">
            <div className="text-emerald-400 font-semibold">Code applied: <span className="font-mono text-white">{couponCode}</span></div>
            <div className="text-emerald-400/80 text-[10px] mt-0.5">Discount calculated at checkout</div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {couponMessage && couponMessage.type === 'error' && (
        <div className="text-[11px] font-medium pt-1 text-red-400" role="status" aria-live="polite">
          {couponMessage.text}
        </div>
      )}

      {/* Celebration Modal */}
      <Modal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        size="sm"
        closeOnBackdropClick={true}
        ariaLabelledBy="celebration-title"
        className="bg-bg-card border border-white/10 rounded-3xl p-8 max-w-xs shadow-2xl"
      >
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
            </div>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 id="celebration-title" className="text-white font-black text-xl mb-2">Promo Code Saved</h3>
          <div className="text-text-secondary text-sm mb-6 space-y-1">
            <p>Code: <span className="text-white font-mono font-bold">{couponCode}</span></p>
            <p className="text-[11px] text-text-muted italic">Discount eligibility will be confirmed during checkout.</p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => setShowCelebration(false)}
            className="w-full bg-gradient-to-r from-accent-purple to-accent-pink py-3 rounded-xl font-bold text-white shadow-glow hover:scale-[1.02] active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      </Modal>
    </div>
  );
}
