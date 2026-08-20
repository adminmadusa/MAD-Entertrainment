'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { extractApiError } from '@/lib/api/client';
import { ensureGuestBookingSession, publicCreateBooking } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { formatMoney } from '@mad/shared';
import type { Event as EventData } from '@mad/types';
import { ReserveTicketsInput } from '@mad/validations';

import { PromoCodeForm } from './PromoCodeForm';

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
  const { isAuthenticated } = useAuth();
  const eventId = event._id;
  const currency = event.currency || 'USD';

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
    // Authenticated users don't need guest session tokens
    if (isAuthenticated) return;

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
  }, [isAuthenticated]);

  useEffect(() => {
    initGuestSession();
  }, [initGuestSession]);

  // Booking Mutation (creates temporary hold/reservation)
  const createBookingMutation = useMutation({
    onSuccess: (booking) => {
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

      if (apiError.toLowerCase().includes('coupon') || apiError.toLowerCase().includes('promo')) {
        setCouponApplied(false);
        setCouponMessage({ type: 'error', text: '⚠ Unable to apply promo code. Please check and try again.' });
      }

      if (setIsPendingChange) setIsPendingChange(false);
    },
    mutationFn: (payload: ReserveTicketsInput) =>
      publicCreateBooking(payload, isAuthenticated ? undefined : sessionToken),
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
    setCouponMessage(null);
    setShowCelebration(true);
    setError('');
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

    createBookingMutation.mutate({
      eventId,
      tickets: ticketsPayload,
      couponCode: couponApplied ? couponCode.trim() : undefined,
    });
  }, [eventId, quantities, couponCode, couponApplied, sessionToken, setIsPendingChange, createBookingMutation]);

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

  return (
    <div className={`space-y-3.5 text-white ${isModal ? '' : 'container-mad max-w-2xl px-4 pb-32 pt-6'}`}>
      {error && (
        <div className="py-2 px-3 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400 text-center" role="alert" aria-live="assertive">
          {error}
          {sessionError && (
            <button
              type="button"
              onClick={initGuestSession}
              className="block mx-auto mt-1.5 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-[11px] transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Ticket Tiers List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary px-0.5">Select Tickets</h2>
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
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-accent-purple-light px-1">
                {groupName}
              </h3>
              <div className="space-y-2">
                {tiersInGroup.map((tier) => {
                  const isFree = !!tier.isFree || tier.price === 0;
                  const offer = tier.offerRules;
                  const discount = tier.discount || 0;
                  const finalPrice = isFree ? 0 : Math.max(0, tier.price - discount);

                  return (
                    <div
                      key={tier.tier}
                      className="glass rounded-xl border border-white/5 p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">{tier.name}</span>
                          {tier.tier && (
                            <span className="text-[9px] font-mono text-accent-purple-light uppercase px-1.5 py-0.5 bg-accent-purple/10 rounded-md border border-accent-purple/20">
                              {tier.tier}
                            </span>
                          )}
                          {tier.groupSize && tier.groupSize > 1 && (
                            <span className="text-[9px] text-emerald-400 font-semibold px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                              Admits {tier.groupSize}
                            </span>
                          )}
                          {isFree && (
                            <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/15 rounded-md border border-emerald-500/30">
                              FREE
                            </span>
                          )}
                          {offer && offer.discountType !== 'none' && (
                            <span className="text-[9px] text-accent-pink font-semibold px-1.5 py-0.5 bg-accent-pink/10 rounded-md border border-accent-pink/20">
                               {offer.discountType === 'percentage'
                                 ? `${offer.discountValue}% OFF`
                                 : `${formatMoney(offer.discountValue, currency)} OFF`}
                            </span>
                          )}
                          {offer && offer.buyQty && offer.freeTicketQty && (
                            <span className="text-[9px] text-accent-cyan font-semibold px-1.5 py-0.5 bg-accent-cyan/10 rounded-md border border-accent-cyan/20">
                              Buy {offer.buyQty} Get {offer.freeTicketQty} Free
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted leading-tight line-clamp-1">
                          {tier.description || 'General Entry Ticket'}
                        </p>
                        {tier.groupSize && tier.groupSize > 1 && (
                          <p className="text-[10px] text-emerald-400 font-medium">
                            ✓ {tier.groupSize} individual entry passes
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isFree ? (
                            <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">
                              FREE
                            </span>
                          ) : (
                            <>
                              <span className="text-accent-purple-light font-black text-xs sm:text-sm">
                                {formatMoney(finalPrice, currency)}
                              </span>
                              {discount > 0 && (
                                <span className="text-[10px] text-text-muted line-through">{formatMoney(tier.price, currency)}</span>
                              )}
                            </>
                          )}
                        </div>

                        {tier.availabilityWindow?.endDate && (
                          <div className="text-[9px] text-accent-cyan">
                            Sales end {new Date(tier.availabilityWindow.endDate).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
                          </div>
                        )}
                      </div>

                      {/* Stepper Counter */}
                      <div className="flex items-center gap-1 bg-background border border-white/10 rounded-xl p-1 shadow-inner shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, -1)}
                          aria-label={`Decrease ${tier.name} tickets`}
                          className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-white">
                          {quantities[tier.tier] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, 1)}
                          aria-label={`Increase ${tier.name} tickets`}
                          className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
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

      {/* Promo Code Form & Verification */}
      <PromoCodeForm
        couponCode={couponCode}
        couponApplied={couponApplied}
        couponMessage={couponMessage}
        showCelebration={showCelebration}
        setShowCelebration={setShowCelebration}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        onCouponChange={handleCouponChange}
      />
    </div>
  );
}
