interface CheckoutPaymentProps {
  selectedGateway: 'stripe' | 'razorpay';
  onChangeGateway: (gateway: 'stripe' | 'razorpay') => void;
}

export function CheckoutPayment({ selectedGateway, onChangeGateway }: CheckoutPaymentProps) {
  const isStripeConfigured =
    process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true' &&
    !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
      <h2 className="text-white font-bold text-sm border-b border-white/10 pb-2">Pay with</h2>

      <div className="space-y-2.5">
        {/* Razorpay — primary supported gateway */}
        <label
          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
            selectedGateway === 'razorpay'
              ? 'bg-accent-purple/10 border-accent-purple'
              : 'bg-white/2 border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="gateway"
              checked={selectedGateway === 'razorpay'}
              onChange={() => onChangeGateway('razorpay')}
              className="accent-accent-purple"
              aria-label="Pay with UPI, Cards or Net Banking via Razorpay"
            />
            <span className="text-xs font-semibold text-white">UPI / Cards / Net Banking</span>
          </div>
          <span className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider">Razorpay</span>
        </label>

        {isStripeConfigured ? (
          /* Stripe — enabled and configured */
          <label
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
              selectedGateway === 'stripe'
                ? 'bg-accent-purple/10 border-accent-purple'
                : 'bg-[#121625] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="gateway"
                checked={selectedGateway === 'stripe'}
                onChange={() => onChangeGateway('stripe')}
                className="accent-accent-purple"
                aria-label="Pay with International Credit or Debit Card via Stripe"
              />
              <span className="text-xs font-semibold text-white">International Card</span>
            </div>
            <span className="text-text-muted">
              <svg className="w-4 h-4 text-text-muted inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </span>
          </label>
        ) : (
          /* Stripe — rendered as disabled with a clear warning subtext */
          <label
            className="flex flex-col p-3 rounded-xl border bg-[#121625] border-white/5 opacity-50 cursor-not-allowed transition-all"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="gateway"
                  disabled
                  checked={false}
                  className="accent-accent-purple cursor-not-allowed"
                  aria-label="Stripe (Currently Unavailable). Please select UPI / Cards via Razorpay."
                />
                <span className="text-xs font-semibold text-text-muted">International Card</span>
              </div>
              <span className="text-text-muted">
                <svg className="w-4 h-4 text-text-muted inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
            </div>
            <span className="text-[10px] text-red-400 mt-1.5 font-medium">
              Stripe (Currently Unavailable). Please select UPI / Cards via Razorpay.
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
