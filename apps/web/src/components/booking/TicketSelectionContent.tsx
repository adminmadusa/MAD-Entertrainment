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
  // Controlled Promo Code props
  couponCode?: string;
  couponApplied?: boolean;
  couponMessage?: { type: 'success' | 'error'; text: string } | null;
  showCelebration?: boolean;
  setShowCelebration?: (show: boolean) => void;
  onApplyCoupon?: (e: React.FormEvent) => void;
  onRemoveCoupon?: () => void;
  onCouponChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hidePromoCodeOnDesktop?: boolean;
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
  couponCode: propCouponCode,
  couponApplied: propCouponApplied,
  couponMessage: propCouponMessage,
  showCelebration: propShowCelebration,
  setShowCelebration: propSetShowCelebration,
  onApplyCoupon: propOnApplyCoupon,
  onRemoveCoupon: propOnRemoveCoupon,
  onCouponChange: propOnCouponChange,
  hidePromoCodeOnDesktop = false,
}: TicketSelectionContentProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const eventId = event._id;
  const currency = event.currency || 'USD';

  const [sessionToken, setSessionToken] = useState('');
  const [sessionError, setSessionError] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [internalCouponCode, setInternalCouponCode] = useState('');
  const [internalCouponApplied, setInternalCouponApplied] = useState(false);
  const [internalCouponMessage, setInternalCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [internalShowCelebration, setInternalShowCelebration] = useState(false);
  const [error, setError] = useState('');

  const couponCode = propCouponCode !== undefined ? propCouponCode : internalCouponCode;
  const couponApplied = propCouponApplied !== undefined ? propCouponApplied : internalCouponApplied;
  const couponMessage = propCouponMessage !== undefined ? propCouponMessage : internalCouponMessage;
  const showCelebration = propShowCelebration !== undefined ? propShowCelebration : internalShowCelebration;
  const setShowCelebration = propSetShowCelebration || setInternalShowCelebration;

  const handleInternalApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalCouponCode.trim()) return;
    setInternalCouponApplied(true);
    setInternalCouponMessage(null);
    setInternalShowCelebration(true);
    setError('');
  };

  const handleInternalRemoveCoupon = () => {
    setInternalCouponCode('');
    setInternalCouponApplied(false);
    setInternalCouponMessage(null);
  };

  const handleInternalCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalCouponCode(e.target.value);
    if (internalCouponApplied) {
      setInternalCouponApplied(false);
      setInternalCouponMessage(null);
    }
  };

  const handleApplyCoupon = propOnApplyCoupon || handleInternalApplyCoupon;
  const handleRemoveCoupon = propOnRemoveCoupon || handleInternalRemoveCoupon;
  const handleCouponChange = propOnCouponChange || handleInternalCouponChange;

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
        if (propOnRemoveCoupon) {
          propOnRemoveCoupon();
        } else {
          setInternalCouponApplied(false);
          setInternalCouponMessage({ type: 'error', text: '⚠ Unable to apply promo code. Please check and try again.' });
        }
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
              const groupName = tierWithMeta.groupName || '';
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push(tierWithMeta);
              return acc;
            }, {})
          ).map(([groupName, tiersInGroup]) => (
            <div key={groupName || 'all'} className="space-y-2">
              {groupName && groupName.toLowerCase() !== 'passes' && (
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-accent-purple-light px-1">
                  {groupName}
                </h3>
              )}
              <div className="divide-y divide-white/10">
                {tiersInGroup.map((tier) => {
                  const isFree = !!tier.isFree || tier.price === 0;
                  const offer = tier.offerRules;
                  const discount = tier.discount || 0;
                  const finalPrice = isFree ? 0 : Math.max(0, tier.price - discount);

                  return (
                    <div
                      key={tier.tier}
                      className="py-4 border-b border-white/10 last:border-b-0 flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        {/* Line 1: Tier Name & Price */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-white capitalize">{tier.name}</span>
                          <span className="text-accent-purple-light font-bold text-sm">
                            {isFree ? 'FREE' : formatMoney(finalPrice, currency)}
                          </span>
                          {discount > 0 && !isFree && (
                            <span className="text-xs text-text-muted line-through">{formatMoney(tier.price, currency)}</span>
                          )}
                          {tier.groupSize && tier.groupSize > 1 && (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              · Admits {tier.groupSize}
                            </span>
                          )}
                          {offer && offer.discountType !== 'none' && (
                            <span className="text-[11px] text-accent-pink font-medium">
                              · {offer.discountType === 'percentage'
                                 ? `${offer.discountValue}% OFF`
                                 : `${formatMoney(offer.discountValue, currency)} OFF`}
                            </span>
                          )}
                          {offer && offer.buyQty && offer.freeTicketQty && (
                            <span className="text-[11px] text-accent-cyan font-medium">
                              · Buy {offer.buyQty} Get {offer.freeTicketQty} Free
                            </span>
                          )}
                        </div>

                        {/* Line 2: Description & Sales End */}
                        <p className="text-xs text-text-muted leading-tight line-clamp-2">
                          {tier.description || 'General Entry Ticket'}
                          {tier.availabilityWindow?.endDate && (
                            <span className="text-accent-cyan ml-1.5">
                              · Sales end {new Date(tier.availabilityWindow.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Stepper Counter */}
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, -1)}
                          aria-label={`Decrease ${tier.name} tickets`}
                          className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-white">
                          {quantities[tier.tier] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(tier.tier, 1)}
                          aria-label={`Increase ${tier.name} tickets`}
                          className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
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
      <div className={hidePromoCodeOnDesktop ? 'block md:hidden' : 'block'}>
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
    </div>
  );
}
