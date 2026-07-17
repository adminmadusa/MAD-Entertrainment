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
    <div className="glass rounded-2xl border border-white/5 p-4 space-y-2">
      <label htmlFor="promo-code-input" className="text-xs text-text-secondary font-semibold">Promo Code</label>
      <form onSubmit={onApplyCoupon} className="flex gap-2">
        <input
          id="promo-code-input"
          type="text"
          value={couponCode}
          onChange={onCouponChange}
          placeholder="Enter code"
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-white/10 text-base lg:text-sm font-mono uppercase text-white focus:outline-none focus:border-accent-purple transition-colors"
        />
        {!couponApplied ? (
          <button
            type="submit"
            disabled={!couponCode.trim()}
            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs text-white transition-all disabled:opacity-40"
          >
            Apply
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        )}
      </form>

      {/* Coupon Applied Details Block */}
      {couponApplied && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mt-3 flex items-start gap-3">
          <span className="text-emerald-400 text-lg">
            <svg className="w-5 h-5 text-emerald-400 inline-block align-text-top" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20a1 1 0 001-1v-2.586a1 1 0 01.293-.707l7.586-7.586a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 0L2.293 11.293A1 1 0 012 12v6a2 2 0 002 2h2z" />
            </svg>
          </span>
          <div>
            <div className="text-emerald-400 font-bold text-sm">Coupon Applied</div>
            <div className="text-text-secondary text-xs mt-0.5">Code: <span className="font-mono text-white font-bold">{couponCode}</span></div>
            <div className="text-emerald-400/80 text-[10px] mt-1 italic">Discount details will be calculated at checkout.</div>
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
