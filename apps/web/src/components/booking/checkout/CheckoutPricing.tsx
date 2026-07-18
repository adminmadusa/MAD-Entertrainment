import type { Booking } from '@mad/types';
import { formatMoney } from '@mad/shared';
import { TicketSummaryItem } from '../shared/TicketSummaryItem';

interface CheckoutPricingProps {
  booking: Booking;
}

export function CheckoutPricing({ booking }: CheckoutPricingProps) {
  const currency = booking.currency || 'USD';
  const taxLabel = booking.taxLabel || 'Sales Tax';
  const taxPercentText = booking.taxPercentage !== undefined && booking.taxPercentage > 0 ? ` (${booking.taxPercentage}%)` : '';

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
            currency={currency}
          />
        ))}
      </div>

      <div className="space-y-2 text-xs border-b border-white/5 pb-3">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal</span>
          <span>{formatMoney(booking.subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Convenience Fee</span>
          <span>{formatMoney(booking.convenienceFee, currency)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>{taxLabel}{taxPercentText}</span>
          <span>{formatMoney(booking.gst, currency)}</span>
        </div>
        {booking.discount > 0 && (
          <div className="flex justify-between text-emerald-400 font-medium">
            <span>Discount</span>
            <span>-{formatMoney(booking.discount, currency)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-sm font-black">
        <span className="text-white">Total Amount</span>
        <span className="text-accent-purple-light text-base">{formatMoney(booking.totalAmount, currency)}</span>
      </div>
    </div>
  );
}
