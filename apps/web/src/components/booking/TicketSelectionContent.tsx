"use client";

import { STORAGE_VERSION } from "@mad/shared";
import { Event as EventData } from "@mad/types";
import { Button } from "@mad/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ReserveTicketsInput } from "@mad/validations";
import { extractApiError } from "@/lib/api/client";
import { publicCreateBooking } from "@/lib/api/public.service";

interface TicketSelectionContentProps {
  event: EventData;
  onClose?: () => void;
  isModal?: boolean;
  onQuantitiesChange?: (
    quantities: Record<string, number>,
    subtotal: number,
    selectedCount: number,
  ) => void;
  // External triggers for checkout when rendered inside a modal
  checkoutTriggerRef?: React.MutableRefObject<(() => void) | null>;
  setIsPendingChange?: (isPending: boolean) => void;
  onBookingSuccess?: (bookingId: string) => void;
}

type TicketTierWithOptionalFields = EventData["ticketTiers"][number] & {
  groupName?: string;
  isFree?: boolean;
  offerRules?: {
    discountType?: "none" | "percentage" | "flat";
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

  const [sessionId, setSessionId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [error, setError] = useState("");

  // Setup unique Session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionKey = `mad_checkout_session_${STORAGE_VERSION}`;
      let sess = sessionStorage.getItem(sessionKey);
      if (!sess) {
        if (typeof window.crypto === "undefined" || !window.crypto.randomUUID) {
          setError(
            "Secure session initialization failed. Please refresh and try again.",
          );
          return;
        }
        sess = window.crypto.randomUUID();
        sessionStorage.removeItem("mad_checkout_session");
        sessionStorage.setItem(sessionKey, sess);
      }
      setSessionId(sess);
    }
  }, []);

  // Booking Mutation (creates temporary hold/reservation)
  const createBookingMutation = useMutation({
    mutationFn: (payload: ReserveTicketsInput) =>
      publicCreateBooking(payload, sessionId),
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
      setError(extractApiError(err).message);
      if (setIsPendingChange) setIsPendingChange(false);
    },
  });

  const handleQtyChange = useCallback(
    (tier: string, change: number) => {
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
    },
    [quantities, event.ticketTiers, onQuantitiesChange],
  );

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setTimeout(() => {
      setCouponApplied(true);
      setIsApplyingCoupon(false);
      alert("Coupon applied! Subtotal will be updated at checkout.");
    }, 600);
  };

  const handleCheckoutSubmit = useCallback(() => {
    setError("");
    if (!eventId) return;

    const ticketsPayload = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tier, qty]) => ({
        tier,
        quantity: qty,
      }));

    if (ticketsPayload.length === 0) {
      setError("Please select at least 1 ticket.");
      return;
    }

    if (setIsPendingChange) setIsPendingChange(true);
    createBookingMutation.mutate({
      eventId,
      tickets: ticketsPayload,
      couponCode: couponCode.trim() || undefined,
    });
  }, [
    eventId,
    quantities,
    couponCode,
    setIsPendingChange,
    createBookingMutation,
  ]);

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
  let subtotal = 0;
  event.ticketTiers.forEach((tier) => {
    const qty = quantities[tier.tier] || 0;
    if (qty > 0) {
      const price = Math.max(0, tier.price - (tier.discount || 0));
      subtotal += price * qty;
    }
  });

  return (
    <div
      className={`space-y-6 text-white ${isModal ? "" : "container-mad max-w-2xl px-4 pb-32 pt-6"}`}
    >
      {error && (
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Promo Code Block */}
      <form
        onSubmit={handleApplyCoupon}
        className="glass rounded-2xl border border-white/5 p-4 space-y-2"
      >
        <label
          htmlFor="promo-code-input"
          className="text-xs text-text-secondary font-semibold"
        >
          Promo Code
        </label>
        <div className="flex gap-2">
          <input
            id="promo-code-input"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter code"
            disabled={couponApplied || isApplyingCoupon}
            className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-white/10 text-base lg:text-sm font-mono uppercase text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={couponApplied || isApplyingCoupon || !couponCode.trim()}
            aria-busy={isApplyingCoupon}
            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs text-white transition-all disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:border-transparent"
          >
            {isApplyingCoupon ? "Applying..." : "Apply"}
          </button>
        </div>
      </form>

      {/* Ticket Tiers List */}
      <div className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-secondary">
          Select Tickets
        </h2>
        <div className="space-y-6">
          {Object.entries(
            event.ticketTiers.reduce<
              Record<string, TicketTierWithOptionalFields[]>
            >((acc, tier) => {
              const tierWithMeta = tier as TicketTierWithOptionalFields;
              const groupName = tierWithMeta.groupName || "Passes";
              if (!acc[groupName]) acc[groupName] = [];
              acc[groupName].push(tierWithMeta);
              return acc;
            }, {}),
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
                  const finalPrice = isFree
                    ? 0
                    : Math.max(0, tier.price - discount);
                  const qty = quantities[tier.tier] || 0;
                  const isSoldOut =
                    tier.quantity !== undefined &&
                    tier.soldCount !== undefined &&
                    tier.soldCount >= tier.quantity;

                  return (
                    <div
                      key={tier.tier}
                      className="glass rounded-2xl border border-white/5 p-5 flex items-center justify-between gap-6 hover:border-white/15 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {tier.name}
                          </span>
                          {isSoldOut && (
                            <span className="text-[9px] text-red-400 font-bold px-2 py-0.5 bg-red-500/15 rounded-full border border-red-500/30">
                              SOLD OUT
                            </span>
                          )}
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
                          {offer && offer.discountType !== "none" && (
                            <span className="text-[9px] text-accent-pink font-semibold px-2 py-0.5 bg-accent-pink/10 rounded-full border border-accent-pink/20">
                              {offer.discountType === "percentage"
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
                          {tier.description || "General Entry Ticket"}
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
                                <span className="text-xs text-text-muted line-through">
                                  ₹{tier.price}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {tier.availabilityWindow?.endDate && (
                          <div className="text-[10px] text-accent-cyan">
                            Sales end on{" "}
                            {new Date(
                              tier.availabilityWindow.endDate,
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Counter */}
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-3 bg-background border border-white/10 rounded-xl p-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(tier.tier, -1)}
                            disabled={qty === 0 || isSoldOut}
                            aria-label={`Decrease ${tier.name} tickets`}
                            className="w-10 h-10 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm font-semibold text-white">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(tier.tier, 1)}
                            disabled={qty >= 10 || isSoldOut}
                            aria-label={`Increase ${tier.name} tickets`}
                            className="w-10 h-10 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center text-white text-base font-bold active:scale-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none"
                          >
                            +
                          </button>
                        </div>
                        {qty >= 10 && (
                          <span className="text-[10px] text-amber-400 font-semibold animate-pulse">
                            Maximum 10 tickets allowed
                          </span>
                        )}
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
                <span className="text-lg font-black text-white">
                  ₹{subtotal}
                </span>
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
