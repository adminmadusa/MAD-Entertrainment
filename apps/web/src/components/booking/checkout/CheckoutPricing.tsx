import { Booking } from "@mad/types";

interface CheckoutPricingProps {
  booking: Booking;
}

export function CheckoutPricing({ booking }: CheckoutPricingProps) {
  const hasTickets = booking.tickets && booking.tickets.length > 0;

  return (
    <div className="glass rounded-2xl border border-white/5 p-4 sm:p-6 space-y-5">
      <h2 className="text-white font-bold text-sm uppercase tracking-wider">
        Payment Details
      </h2>

      {/* Selected Tickets Breakdown */}
      <div className="space-y-2 text-xs border-b border-white/5 pb-3">
        <div className="text-text-secondary/60 font-bold tracking-wider uppercase text-[10px]">
          Tickets Selected
        </div>
        {hasTickets ? (
          booking.tickets.map((ticket, idx) => (
            <div
              key={idx}
              className="flex justify-between text-white font-medium"
            >
              <span>
                {ticket.tierName || ticket.tier} x{ticket.quantity}
              </span>
              <span className="text-text-secondary font-mono">
                ₹{ticket.subtotal}
              </span>
            </div>
          ))
        ) : (
          <div className="text-text-secondary/40 text-xs text-center py-4">
            No tickets selected.
          </div>
        )}
      </div>

      {/* Fees & Summary Breakdown */}
      <div className="space-y-2.5 text-xs border-b border-white/5 pb-3">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal</span>
          <span className="text-white font-medium">₹{booking.subtotal}</span>
        </div>
        {booking.discount > 0 && (
          <div className="flex justify-between items-center text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
            <span className="flex items-center gap-1.5">
              <span>🏷️ Coupon Applied</span>
              {booking.couponCode && (
                <span className="font-mono text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider">
                  {booking.couponCode}
                </span>
              )}
            </span>
            <span>-₹{booking.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-text-secondary/80">
          <span>Convenience Fee</span>
          <span>₹{booking.convenienceFee}</span>
        </div>
        <div className="flex justify-between text-text-secondary/80">
          <span>GST (18%)</span>
          <span>₹{booking.gst}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-1">
        <span className="text-sm font-bold text-white tracking-tight">
          Total Amount
        </span>
        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-purple-light to-accent-pink tracking-tight">
          ₹{booking.totalAmount}
        </span>
      </div>
    </div>
  );
}
