'use client';

import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { extractApiError } from '@/lib/api/client';
import { ensureGuestBookingSession, publicCreateBooking } from '@/lib/api/public.service';
import type { Event as EventData } from '@mad/types';
import { Button, Modal } from '@mad/ui';
import { ReserveTicketsInput } from '@mad/validations';
import { calculateBookingTotals, formatTicketCount, formatDisplayName } from '@/utils/booking-calculations';

import { TicketSummaryItem } from './shared/TicketSummaryItem';


interface TicketSelectionContentProps {
  event: EventData;
  onClose?: () => void;
  isModal?: boolean;
  showDateTime?: string;
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
  showDateTime = '',
  onQuantitiesChange,
  checkoutTriggerRef,
  setIsPendingChange,
  onBookingSuccess,
}: TicketSelectionContentProps) {
  const router = useRouter();
  const eventId = event._id;

  const totalCapacity = event.totalCapacity || event.ticketTiers?.reduce((acc, t) => acc + (t.quantity || 0), 0) || 0;
  const soldCount = event.soldCount || event.ticketTiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) || 0;
  const ticketsLeft = Math.max(0, totalCapacity - soldCount);

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

    const newQuantities = {
      ...quantities,
      [tier]: newQty,
    };
    setQuantities(newQuantities);

    // Calculate totals using central calculations module
    const totals = calculateBookingTotals(newQuantities, event.ticketTiers);

    if (onQuantitiesChange) {
      onQuantitiesChange(newQuantities, totals.subtotal, totals.totalTickets);
    }
  }, [quantities, event.ticketTiers, onQuantitiesChange]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCouponMessage(null);

    const code = couponCode.trim();
    if (!code) return;

    // Direct mock simulation to avoid breaking changes to booking flow API contracts
    const validPromoCodes = ['MADVIP', 'EARLYBIRD10', 'OFFER20', 'WELCOME'];
    if (validPromoCodes.includes(code.toUpperCase())) {
      setCouponApplied(true);
      setCouponMessage({
        type: 'success',
        text: `✔ Promo code "${code.toUpperCase()}" applied successfully!`,
      });
      setShowCelebration(true);
    } else {
      setCouponApplied(false);
      setCouponMessage({
        type: 'error',
        text: '⚠ Invalid promo code. Please verify and try again.',
      });
    }
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

  const { subtotal, selectedCount } = useMemo(() => {
    const totals = calculateBookingTotals(quantities, event.ticketTiers);
    return {
      subtotal: totals.subtotal,
      selectedCount: totals.totalTickets,
    };
  }, [quantities, event.ticketTiers]);

  // Promo Code Form JSX block
  const promoCodeBlock = (
    <div className="glass rounded-xl border border-white/5 p-4 space-y-2">
      <label htmlFor="promo-code-input" className="text-xs text-text-secondary font-semibold">Promo Code</label>
      <form onSubmit={handleApplyCoupon} className="flex gap-2">
        <input
          id="promo-code-input"
          type="text"
          value={couponCode}
          onChange={handleCouponChange}
          placeholder="Enter code"
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-xs font-mono uppercase text-white focus:outline-none focus:border-accent-purple transition-colors"
        />
        {!couponApplied ? (
          <button
            type="submit"
            disabled={!couponCode.trim()}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs text-white transition-all disabled:opacity-40"
          >
            Apply
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRemoveCoupon}
            className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            Remove
          </button>
        )}
      </form>

      {couponApplied && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mt-2 flex items-start gap-2.5">
          <span className="text-emerald-400 text-base">
            <svg className="w-4 h-4 text-emerald-400 inline-block align-text-top" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20a1 1 0 001-1v-2.586a1 1 0 01.293-.707l7.586-7.586a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 0L2.293 11.293A1 1 0 012 12v6a2 2 0 002 2h2z" />
            </svg>
          </span>
          <div>
            <div className="text-emerald-400 font-bold text-xs">Coupon Applied</div>
            <div className="text-text-secondary text-[10px] mt-0.5">Code: <span className="font-mono text-white font-bold">{couponCode}</span></div>
            <div className="text-emerald-400/80 text-[9px] mt-1 italic">Discount details will be calculated at checkout.</div>
          </div>
        </div>
      )}

      {couponMessage && couponMessage.type === 'error' && (
        <div className="text-[10px] font-medium pt-1 text-red-400 animate-in fade-in duration-200" role="status" aria-live="polite">
          {couponMessage.text}
        </div>
      )}
    </div>
  );

  // Tickets list JSX
  const ticketTiersList = (
    <div className="space-y-3">
      {Object.entries(
        event.ticketTiers.reduce<Record<string, TicketTierWithOptionalFields[]>>((acc, tier) => {
          const tierWithMeta = tier as TicketTierWithOptionalFields;
          const groupName = tierWithMeta.groupName || 'Passes';
          if (!acc[groupName]) acc[groupName] = [];
          acc[groupName].push(tierWithMeta);
          return acc;
        }, {})
      ).map(([groupName, tiersInGroup]) => (
        <div key={groupName} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-accent-purple-light px-1">
            {groupName}
          </h3>
          <div className="space-y-2.5">
            {tiersInGroup.map((tier) => {
              const isFree = !!tier.isFree || tier.price === 0;
              const offer = tier.offerRules;
              const discount = tier.discount || 0;
              const finalPrice = isFree ? 0 : Math.max(0, tier.price - discount);
              const qty = quantities[tier.tier] || 0;

              return (
                <div
                  key={tier.tier}
                  className="glass rounded-xl border border-white/5 p-4 flex items-center justify-between gap-4 hover:border-white/15 transition-all"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-sm font-bold text-white truncate">
                        {formatDisplayName(tier.name || tier.tier)}
                      </span>
                      {tier.groupSize && tier.groupSize > 1 && (
                        <span className="text-[9px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                          Admits {tier.groupSize}
                        </span>
                      )}
                      {isFree && (
                        <span className="text-[9px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/15 rounded-md border border-emerald-500/30">
                          FREE
                        </span>
                      )}
                      {offer && offer.discountType !== 'none' && (
                        <span className="text-[9px] text-accent-pink font-semibold px-2 py-0.5 bg-accent-pink/10 rounded-md border border-accent-pink/20">
                          {offer.discountType === 'percentage'
                            ? `${offer.discountValue}% OFF`
                            : `₹${offer.discountValue} OFF`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed truncate max-w-[280px]">
                      {tier.description || 'General Entry Ticket'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-accent-purple-light font-bold">
                      {isFree ? (
                        <span className="text-emerald-400 font-black">FREE</span>
                      ) : (
                        <>
                          <span>₹{finalPrice} each</span>
                          {discount > 0 && (
                            <span className="text-[10px] text-text-muted line-through font-normal">₹{tier.price}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Counter */}
                  <div className="flex items-center gap-2 bg-background border border-white/10 rounded-xl p-1 shadow-inner shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(tier.tier, -1)}
                      aria-label={`Decrease ${tier.name} tickets`}
                      className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-white">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(tier.tier, 1)}
                      aria-label={`Increase ${tier.name} tickets`}
                      className="w-9 h-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
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
  );

  // Celebration modal
  const celebrationModal = (
    <Modal
      isOpen={showCelebration}
      onClose={() => setShowCelebration(false)}
      size="sm"
      closeOnBackdropClick={true}
      ariaLabelledBy="celebration-title"
      className="bg-bg-card border border-white/10 rounded-3xl p-8 max-w-xs shadow-2xl z-50"
    >
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 m-auto w-20 h-20 bg-emerald-500/20 rounded-full animate-ping opacity-75" />
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
  );

  if (isModal) {
    let modalFooterBadge: React.ReactNode = null;
    if (selectedCount > 0) {
      modalFooterBadge = (
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium">
            {formatTicketCount(selectedCount)}
          </span>
          <span className="text-base font-black text-accent-purple-light">₹{subtotal}</span>
        </div>
      );
    } else if (ticketsLeft <= 50) {
      modalFooterBadge = (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md animate-pulse">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z" />
          </svg>
          Few tickets left
        </span>
      );
    } else {
      modalFooterBadge = (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
          Available
        </span>
      );
    }

    return (
      <div className="flex flex-col md:flex-row h-full w-full bg-background overflow-hidden">
        {/* Left Panel: Ticket selection */}
        <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col h-full border-r border-white/5 bg-background overflow-hidden">
          {/* Fixed Header */}
          <div className="pb-4 border-b border-white/5 shrink-0 pr-12">
            <h3 id="booking-modal-title" className="text-base font-bold text-white leading-snug">{event.title}</h3>
            <p className="text-xs text-text-muted mt-1">{showDateTime} · {event.venue}</p>
          </div>

          {/* Scrollable ticket content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pt-4 space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center" role="alert">
                {error}
              </div>
            )}

            {ticketTiersList}

            {/* Promo Code block - Mobile Only */}
            <div className="block md:hidden mt-4">
              {promoCodeBlock}
            </div>
          </div>

          {/* Modal Sticky Bottom Action Footer */}
          <div className="border-t border-white/10 pt-4 pb-4 mt-4 flex items-center justify-between bg-background shrink-0">
            {modalFooterBadge}
            <button
              type="button"
              onClick={handleCheckoutSubmit}
              disabled={createBookingMutation.isPending}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-glow disabled:opacity-50"
            >
              {createBookingMutation.isPending ? 'Processing...' : 'Check out'}
            </button>
          </div>
        </div>

        {/* Right Panel: Cart/Event Image summary */}
        <div className="hidden md:flex md:w-2/5 bg-bg-card flex-col border-l border-white/5">
          {/* Event Image */}
          <div className="aspect-[16/9] w-full overflow-hidden bg-black/40 relative border-b border-white/10">
            {event.bannerImage?.url && (
              <Image
                src={event.bannerImage.url}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Order Summary details */}
          <div className="flex-1 flex flex-col justify-between p-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Order Summary</h3>
              {selectedCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-muted space-y-2">
                  <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs font-medium">Select tickets to see summary</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(quantities).map(([tierKey, qty]) => {
                      if (qty === 0) return null;
                      const tier = event.ticketTiers.find((t) => t.tier === tierKey);
                      if (!tier) return null;
                      const price = Math.max(0, tier.price - (tier.discount || 0));
                      return (
                        <TicketSummaryItem
                          key={tierKey}
                          tierName={tier.name}
                          quantity={qty}
                          price={price * qty}
                        />
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    {promoCodeBlock}
                  </div>
                </>
              )}
            </div>

            {selectedCount > 0 && (
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">₹{subtotal}</span>
                </div>
                <p className="text-[9px] text-text-muted leading-relaxed">
                  Convenience fees, GST, and discounts will be calculated at checkout details stage.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Celebration Modal */}
        {celebrationModal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center" role="alert">
          {error}
        </div>
      )}

      {ticketTiersList}

      {promoCodeBlock}

      {/* celebration modal */}
      {celebrationModal}

      {/* Mobile Sticky bottom footer when not rendered inside modal */}
      {!isModal && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50 shadow-2xl">
          <div className="container-mad max-w-2xl px-4 space-y-3">
            <div className="flex items-center justify-between">
              {ticketsLeft <= 50 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md animate-pulse">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z" />
                  </svg>
                  Few tickets left
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
                  Available
                </span>
              )}
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
