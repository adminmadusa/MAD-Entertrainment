'use client';

import { QUERY_KEYS, STORAGE_VERSION } from '@mad/shared';
import { Event as EventData } from '@mad/types';
import { Button } from '@mad/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicCreateBooking } from '@/lib/api/public.service';

interface TicketSelectionContentProps {
  event: EventData;
  onClose?: () => void;
  isModal?: boolean;
  onQuantitiesChange?: (quantities: Record<string, number>, subtotal: number, selectedCount: number) => void;
  // External triggers for checkout when rendered inside a modal
  checkoutTriggerRef?: React.RefObject<(() => void) | null>;
  setIsPendingChange?: (isPending: boolean) => void;
}

export function TicketSelectionContent({
  event,
  onClose,
  isModal = false,
  onQuantitiesChange,
  checkoutTriggerRef,
  setIsPendingChange,
}: TicketSelectionContentProps) {
  const router = useRouter();
  const eventId = event._id;

  const [sessionId, setSessionId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [error, setError] = useState('');

  // Setup unique Session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
      let sess = sessionStorage.getItem(sessionKey);
      if (!sess) {
        if (typeof window.crypto !== 'undefined' && window.crypto.randomUUID) {
          sess = window.crypto.randomUUID();
        } else {
          sess = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
        sessionStorage.removeItem('mad_checkout_session');
        sessionStorage.setItem(sessionKey, sess);
      }
      setSessionId(sess);
    }
  }, []);

  // Booking Mutation (creates temporary hold/reservation)
  const createBookingMutation = useMutation({
    mutationFn: (payload: any) => publicCreateBooking(payload, sessionId),
    onSuccess: (booking) => {
      // Close modal before redirecting
      if (onClose) onClose();
      router.push(`/checkout/${booking.bookingId}`);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      if (setIsPendingChange) setIsPendingChange(false);
    },
  });

  const handleQtyChange = (tier: string, change: number) => {
    setQuantities((prev) => {
      const val = (prev[tier] || 0) + change;
      const next = {
        ...prev,
        [tier]: Math.max(0, Math.min(10, val)),
      };

      let totalCount = 0;
      let sub = 0;
      event.ticketTiers.forEach((t) => {
        const qty = next[t.tier] || 0;
        if (qty > 0) {
          totalCount += qty;
          sub += Math.max(0, t.price - (t.discount || 0)) * qty;
        }
      });

      // Notify parent of subtotal/quantity changes if callback provided
      if (onQuantitiesChange) {
        onQuantitiesChange(next, sub, totalCount);
      }

      return next;
    });
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponApplied(true);
    alert('Coupon applied! Subtotal will be updated at checkout.');
  };

  const handleCheckoutSubmit = useCallback(() => {
    setError('');
    if (!eventId) return;

    const ticketsPayload = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tier, qty]) => ({
        tier,
        quantity: qty,
      }));

    if (ticketsPayload.length === 0) {
      setError('Please select at least 1 ticket.');
      return;
    }

    if (setIsPendingChange) setIsPendingChange(true);
    createBookingMutation.mutate({
      eventId,
      tickets: ticketsPayload,
      couponCode: couponCode.trim() || undefined,
    });
  }, [eventId, quantities, couponCode, setIsPendingChange, createBookingMutation]);

  // Expose the checkout submit method externally (for modal button clicks)
  useEffect(() => {
    if (checkoutTriggerRef) {
      // @ts-ignore
      checkoutTriggerRef.current = handleCheckoutSubmit;
    }
    return () => {
      if (checkoutTriggerRef) {
        // @ts-ignore
        checkoutTriggerRef.current = null;
      }
    };
  }, [quantities, eventId, sessionId, couponCode, checkoutTriggerRef, handleCheckoutSubmit]);

  // Calculate local subtotal estimation for sticky footer
  let selectedCount = 0;
  let subtotal = 0;
  event.ticketTiers.forEach((tier) => {
    const qty = quantities[tier.tier] || 0;
    if (qty > 0) {
      selectedCount += qty;
      const price = Math.max(0, tier.price - (tier.discount || 0));
      subtotal += price * qty;
    }
  });

  return (
    <div className={`space-y-6 text-white ${isModal ? '' : 'container-mad max-w-2xl px-4 pb-32 pt-6'}`}>
      {error && (
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Promo Code Block */}
      <form onSubmit={handleApplyCoupon} className="glass rounded-2xl border border-white/5 p-4 space-y-2">
        <label className="text-xs text-text-secondary font-semibold">Promo Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter code"
            disabled={couponApplied}
            className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-white/10 text-sm font-mono uppercase text-white focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={couponApplied || !couponCode.trim()}
            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs text-white transition-all disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </form>

      {/* Ticket Tiers List */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary">Select Tickets</h2>
        <div className="space-y-3">
          {event.ticketTiers.map((tier) => (
            <div
              key={tier.tier}
              className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-6 hover:border-white/15 transition-all"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{tier.name}</span>
                  {tier.groupSize && tier.groupSize > 1 && (
                    <span className="text-[9px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      Admits {tier.groupSize}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {tier.description || 'General Admission Entry Ticket'}
                </p>
                
                <div className="flex items-center gap-2">
                  <span className="text-accent-purple-light font-black text-sm">
                    ₹{Math.max(0, tier.price - (tier.discount || 0))}
                  </span>
                  {tier.discount && tier.discount > 0 && (
                    <span className="text-xs text-text-muted line-through">₹{tier.price}</span>
                  )}
                </div>

                {tier.availabilityWindow?.endDate && (
                  <div className="text-[10px] text-accent-cyan">
                    Sales end on {new Date(tier.availabilityWindow.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Counter */}
              <div className="flex items-center gap-3 bg-background border border-white/10 rounded-xl p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleQtyChange(tier.tier, -1)}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform"
                >
                  -
                </button>
                <span className="w-5 text-center text-sm font-semibold text-white">
                  {quantities[tier.tier] || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(tier.tier, 1)}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Sticky bottom footer when not rendered inside modal */}
      {!isModal && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0d111d]/95 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl">
          <div className="container-mad max-w-2xl px-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md animate-pulse">
                🔥 Few tickets left
              </span>
              <div className="text-right">
                <span className="text-lg font-black text-white">₹{subtotal}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleCheckoutSubmit}
              isLoading={createBookingMutation.isPending}
              className="py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all"
            >
              Check out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
