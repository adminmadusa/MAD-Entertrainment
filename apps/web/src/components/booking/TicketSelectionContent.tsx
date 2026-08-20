'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { extractApiError } from '@/lib/api/client';
import { ensureGuestBookingSession, publicCreateBooking } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import type { Event as EventData } from '@mad/types';
import { Button } from '@mad/ui';
import { ReserveTicketsInput } from '@mad/validations';

import { PromoCodeForm } from './PromoCodeForm';
import { TicketTierList } from './TicketTierList';

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={initGuestSession}
              className="block mx-auto mt-1.5 px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-[11px] transition-all"
            >
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Ticket Tiers List */}
      <TicketTierList
        ticketTiers={event.ticketTiers}
        currency={currency}
        quantities={quantities}
        onQtyChange={handleQtyChange}
      />

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
