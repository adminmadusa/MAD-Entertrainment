interface CheckoutPaymentProps {
  selectedGateway: "stripe" | "razorpay";
  onChangeGateway: (gateway: "stripe" | "razorpay") => void;
}

export function CheckoutPayment({
  selectedGateway,
  onChangeGateway,
}: CheckoutPaymentProps) {
  return (
    <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
      <h2 className="text-white font-bold text-sm border-b border-white/10 pb-2">
        Pay with
      </h2>

      <div className="space-y-2.5">
        {/* Razorpay — primary supported gateway */}
        <label
          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
            selectedGateway === "razorpay"
              ? "bg-accent-purple/10 border-accent-purple"
              : "bg-white/2 border-white/5 hover:border-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="gateway"
              checked={selectedGateway === "razorpay"}
              onChange={() => onChangeGateway("razorpay")}
              className="accent-accent-purple"
              aria-label="Pay with UPI, Cards or Net Banking via Razorpay"
            />
            <span className="text-xs font-semibold text-white">
              UPI / Cards / Net Banking
            </span>
          </div>
          <span className="text-[10px] text-accent-cyan font-bold uppercase tracking-wider">
            Razorpay
          </span>
        </label>

        {/* Stripe — shown only when explicitly enabled via env flag */}
        {process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true" && (
          <label
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
              selectedGateway === "stripe"
                ? "bg-[#a855f7]/10 border-accent-purple"
                : "bg-white/2 border-white/5 hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="gateway"
                checked={selectedGateway === "stripe"}
                onChange={() => onChangeGateway("stripe")}
                className="accent-accent-purple"
                aria-label="Pay with International Credit or Debit Card via Stripe"
              />
              <span className="text-xs font-semibold text-white">
                International Card
              </span>
            </div>
            <span className="text-base">💳</span>
          </label>
        )}
      </div>
    </div>
  );
}
