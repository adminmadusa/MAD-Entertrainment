import type { Booking } from '@mad/types';
import { TicketSummaryItem } from '../shared/TicketSummaryItem';

interface CheckoutPricingProps {
  booking: Booking;
}

export function CheckoutPricing({ booking }: CheckoutPricingProps) {
  return (
    <div className="glass rounded-2xl border border-white/5 p-5 space-y-4">
      <h2 className="text-white font-bold text-sm uppercase tracking-wider">Your Tickets</h2>

      <div className="space-y-2 border-b border-white/5 pb-3">
        {booking.tickets.map((t, index) => (
          <TicketSummaryItem
            key={index}
            tierName={t.tierName}
            quantity={t.quantity}
            price={t.subtotal}
          />
        ))}
      </div>

      <div className="space-y-2 text-xs border-b border-white/5 pb-3">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal</span>
          <span>₹{booking.subtotal}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Convenience Fee</span>
          <span>₹{booking.convenienceFee}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>GST (18%)</span>
          <span>₹{booking.gst}</span>
        </div>
        {booking.discount > 0 && (
          <div className="flex justify-between text-emerald-400 font-medium">
            <span>Discount</span>
            <span>-₹{booking.discount}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-sm font-black">
        <span className="text-white">Total Amount</span>
        <span className="text-accent-purple-light text-base">₹{booking.totalAmount}</span>
      </div>
    </div>
  );
}
