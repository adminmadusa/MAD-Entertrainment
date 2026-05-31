'use client';

import { Event as EventData } from '@mad/types';
import { Button } from '@mad/ui';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { extractApiError } from '@/lib/api/client';
import { ensureGuestBookingSession, publicCreateBooking } from '@/lib/api/public.service';
import { ReserveTicketsInput } from '@mad/validations';

interface TicketSelectionContentProps {
  event: EventData;
  onClose?: () => void;
  isModal?: boolean;
  onQuantitiesChange?: (quantities: Record<string, number>, subtotal: number, selectedCount: number) => void;
  // External triggers for checkout when rendered inside a modal
  checkoutTriggerRef?: React.MutableRefObject<(() => void) | null>;
  setIsPendingChange?: (isPending: boolean) => void;
  onBookingSuccess?: (bookingId: string) => void;
}

type TicketTierWithOptionalFields = EventData['ticketTiers'][number] & {
  groupName?: string;
  isFree?: boolean;
  offerRules?: {
    discountType?: 'none' | 'percentage' | 'flat';
    discountValue?: number;
    buyQty?: number;
    freeTicketQty?: number;
  };
};

export function TicketSelectionContent({
  event,
  onClose,
  isModal = false,
  onQuantitiesChange,
  checkoutTriggerRef,
  setIsPendingChange,
  onBookingSuccess,
}: TicketSelectionContentProps) {
  const router = useRouter();
  const eventId = event._id;

  const [sessionToken, setSessionToken] = useState('');
  const [sessionError, setSessionError] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [error, setError] = useState('');

  // Setup signed guest session token — extracted for retry support
  const initGuestSession = useCallback(() => {
    setSessionError(false);
    setError('');

    ensureGuestBookingSession()
      .then((session) => {
        setSessionToken(session.token);
      })
      .catch(() => {
        setSessionError(true);
        setError('Secure session initialization failed. Please refresh and try again.');
      });
  }, []);

  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  // Booking Mutation (creates temporary hold/reservation)
  const createBookingMutation = useMutation({
    mutationFn: (payload: ReserveTicketsInput) => publicCreateBooking(payload, sessionToken),
    onSuccess: (booking) => {
      // Close modal before redirecting
      if (onClose) onClose();
      if (setIsPendingChange) setIsPendingChange(false);
      if (onBookingSuccess) {
        onBookingSuccess(booking.bookingId);
      } else {
        router.push(`/checkout/${booking.bookingId}`);
      }
    },
    onError: (err) => {
      const apiError = extractApiError(err).message;
      setError(apiError);
      
      // If error might be coupon related, clear the success state
      if (apiError.toLowerCase().includes('coupon') || apiError.toLowerCase().includes('promo')) {
        setCouponApplied(false);
        setCouponMessage({ type: 'error', text: '⚠ Unable to apply promo code. Please check and try again.' });
      }
      
      if (setIsPendingChange) setIsPendingChange(false);
    },
  });

  const handleQtyChange = useCallback((tier: string, change: number) => {
    const prevQty = quantities[tier] || 0;
    const newQty = Math.max(0, Math.min(10, prevQty + change));

    if (newQty === prevQty) return;

    const next = {
      ...quantities,
      [tier]: newQty,
    };

    setQuantities(next);

    if (onQuantitiesChange) {
      let totalCount = 0;
      let sub = 0;
      event.ticketTiers.forEach((t) => {
        const qty = next[t.tier] || 0;
        if (qty > 0) {
          totalCount += qty;
          sub += Math.max(0, t.price - (t.discount || 0)) * qty;
        }
      });
      onQuantitiesChange(next, sub, totalCount);
    }
  }, [quantities, event.ticketTiers, onQuantitiesChange]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponApplied(true);
    setCouponMessage(null); // Clear simple message, using detailed block now
    setShowCelebration(true);
    setError(''); // Clear general errors if any
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponMessage(null);
  };

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCouponCode(e.target.value);
    if (couponApplied) {
      setCouponApplied(false);
      setCouponMessage(null);
    }
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

    if (!sessionToken) {
      setError('Secure session initialization failed. Please refresh and try again.');
      return;
    }

    if (setIsPendingChange) setIsPendingChange(true);
    
    // Only send coupon code if it's explicitly applied
    createBookingMutation.mutate({
      eventId,
      tickets: ticketsPayload,
      couponCode: couponApplied ? couponCode.trim() : undefined,
    });
  }, [eventId, quantities, couponCode, couponApplied, sessionToken, setIsPendingChange, createBookingMutation]);

  // Expose the checkout submit method externally (for modal button clicks)
  useEffect(() => {
    if (checkoutTriggerRef) {
      checkoutTriggerRef.current = handleCheckoutSubmit;
    }
    return () => {
      if (checkoutTriggerRef) {
        checkoutTriggerRef.current = null;
      }
    };
  }, [checkoutTriggerRef, handleCheckoutSubmit]);

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
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center" role="alert" aria-live="assertive">
          {error}
          {sessionError && (
            <button
              type="button"
              onClick={initGuestSession}
              className="block mx-auto mt-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-xs transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Promo Code Block */}
      <div className="glass rounded-2xl border border-white/5 p-4 space-y-2">
        <label htmlFor="promo-code-input" className="text-xs text-text-secondary font-semibold">Promo Code</label>
        <form onSubmit={handleApplyCoupon} className="flex gap-2">
          <input
            id="promo-code-input"
            type="text"
            value={couponCode}
            onChange={handleCouponChange}
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
              onClick={handleRemoveCoupon}
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
             <span className="text-emerald-400 text-lg">🏷️</span>
             <div>
               <div className="text-emerald-400 font-bold text-sm">Coupon Applied</div>
               <div className="text-text-secondary text-xs mt-0.5">Code: <span className="font-mono text-white font-bold">{couponCode}</span></div>
               <div className="text-emerald-400/80 text-[10px] mt-1 italic">Discount details will be calculated at checkout.</div>
             </div>
          </div>
        )}

        {/* Error Messages (if any) */}
        {couponMessage && couponMessage.type === 'error' && (
          <div 
            className="text-[11px] font-medium pt-1 text-red-400"
            role="status"
            aria-live="polite"
          >
            {couponMessage.text}
          </div>
        )}
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
          role="dialog" 
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              setShowCelebration(false);
            }
          }}
        >
          <div className="bg-[#1a1d2d] border border-white/10 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="relative w-24 h-24 mx-auto mb-6">
              {/* Fake confetti effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
              </div>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto relative z-10 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-white font-black text-xl mb-2">Promo Code Saved</h3>
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
        </div>
      )}

      {/* Ticket Tiers List */}
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary">Select Tickets</h2>
        <div className="space-y-6">
          {Object.entries(
            event.ticketTiers.reduce<Record<string, TicketTierWithOptionalFields[]>>((acc, tier) => {
              const tierWithMeta = tier as TicketTierWithOptionalFields;
              const groupName = tierWithMeta.groupName || 'Passes';
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push(tierWithMeta);
              return acc;
            }, {})
          ).map(([groupName, tiersInGroup]) => (
            <div key={groupName} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent-purple-light px-1">
                {groupName}
              </h3>
              <div className="space-y-3">
                {tiersInGroup.map((tier) => {
                  const isFree = !!tier.isFree || tier.price === 0;
                  const offer = tier.offerRules;
                  const discount = tier.discount || 0;
                  const finalPrice = isFree ? 0 : Math.max(0, tier.price - discount);

                  return (
                    <div
                      key={tier.tier}
                      className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-6 hover:border-white/15 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white">{tier.name}</span>
                          {tier.groupSize && tier.groupSize > 1 && (
                            <span className="text-[9px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                              Admits {tier.groupSize}
                            </span>
                          )}
                          {isFree && (
                            <span className="text-[9px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/15 rounded-full border border-emerald-500/30">
                              FREE TICKET
                            </span>
                          )}
                          {offer && offer.discountType !== 'none' && (
                            <span className="text-[9px] text-accent-pink font-semibold px-2 py-0.5 bg-accent-pink/10 rounded-full border border-accent-pink/20">
                              {offer.discountType === 'percentage'
                                ? `${offer.discountValue}% OFF`
                                : `₹${offer.discountValue} OFF`}
                            </span>
                          )}
                          {offer && offer.buyQty && offer.freeTicketQty && (
                            <span className="text-[9px] text-accent-cyan font-semibold px-2 py-0.5 bg-accent-cyan/10 rounded-full border border-accent-cyan/20">
                              Buy {offer.buyQty} Get {offer.freeTicketQty} Free
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {tier.description || 'General Entry Ticket'}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          {isFree ? (
                            <span className="text-emerald-400 font-black text-sm uppercase tracking-wider">
                              FREE
                            </span>
                          ) : (
                            <>
                              <span className="text-accent-purple-light font-black text-sm">
                                ₹{finalPrice}
                              </span>
                              {discount > 0 && (
                                <span className="text-xs text-text-muted line-through">₹{tier.price}</span>
                              )}
                            </>
                          )}
                        </div>

                        {tier.availabilityWindow?.endDate && (
                          <div className="text-[10px] text-accent-cyan">
                            Sales end on {new Date(tier.availabilityWindow.endDate).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
                          </div>
                        )}
                      </div>

                      {/* Counter */}
                      <div className="flex items-center gap-3 bg-background border border-white/10 rounded-xl p-1 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, -1)}
                          aria-label={`Decrease ${tier.name} tickets`}
                          className="w-10 h-10 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus:ring-1 focus:ring-accent-purple"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-white">
                          {quantities[tier.tier] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, 1)}
                          aria-label={`Increase ${tier.name} tickets`}
                          className="w-10 h-10 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus:ring-1 focus:ring-accent-purple"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
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
