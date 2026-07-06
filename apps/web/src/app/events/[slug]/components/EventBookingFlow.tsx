'use client';

import Image from 'next/image';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

import { CheckoutContent } from '@/components/booking/CheckoutContent';
import { TicketSelectionContent } from '@/components/booking/TicketSelectionContent';
import type { Event as EventData } from '@mad/types';
import { Modal } from '@mad/ui';

export type EventBookingFlowHandle = {
  openBooking: () => void;
};

type EventBookingFlowProps = {
  event: EventData;
  showDateTime: string;
  ticketsLeft: number;
};

export const EventBookingFlow = forwardRef<EventBookingFlowHandle, EventBookingFlowProps>(
  function EventBookingFlow({ event, showDateTime, ticketsLeft }, ref) {
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [subtotal, setSubtotal] = useState(0);
    const [selectedCount, setSelectedCount] = useState(0);
    const [isPending, setIsPending] = useState(false);
    const checkoutTriggerRef = useRef<(() => void) | null>(null);

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);



    useImperativeHandle(ref, () => ({
      openBooking: () => setIsBookingModalOpen(true),
    }));

    useEffect(() => {
      if (isBookingModalOpen || isCheckoutModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isBookingModalOpen, isCheckoutModalOpen]);

    let modalFooterBadge: ReactNode = null;
    if (selectedCount > 0) {
      modalFooterBadge = (
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium">
            {selectedCount} {selectedCount === 1 ? 'ticket' : 'tickets'}
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
      <>
        {/* Ticket Selection Modal overlay */}
        <Modal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          size="lg"
          showCloseButton={false}
          closeOnBackdropClick={true}
          ariaLabelledBy="booking-modal-title"
          className="w-full h-full md:h-[650px] max-w-4xl bg-background md:rounded-2xl border border-white/10 overflow-hidden relative flex flex-col md:flex-row shadow-2xl z-10 focus:outline-none p-0"
        >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                aria-label="Close ticket selection modal"
                className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors z-20 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              >
                ✕
              </button>

              {/* Left Panel: Ticket selection */}
              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col h-full border-r border-white/5 bg-background overflow-hidden">
                {/* Fixed Header */}
                <div className="pb-4 border-b border-white/5 shrink-0 pr-12">
                  <h3 id="booking-modal-title" className="text-base font-bold text-white leading-snug">{event.title}</h3>
                  <p className="text-xs text-text-muted mt-1">{showDateTime} · {event.venue}</p>
                </div>

                {/* Scrollable ticket content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pt-4 space-y-4">
                  <TicketSelectionContent
                    event={event}
                    isModal={true}
                    onClose={() => setIsBookingModalOpen(false)}
                    onQuantitiesChange={(q, s, c) => {
                      setQuantities(q);
                      setSubtotal(s);
                      setSelectedCount(c);
                    }}
                    checkoutTriggerRef={checkoutTriggerRef}
                    setIsPendingChange={setIsPending}
                    onBookingSuccess={(bookingId) => {
                      setCheckoutBookingId(bookingId);
                      setIsCheckoutModalOpen(true);
                    }}
                  />
                </div>

                {/* Modal Sticky Bottom Action Footer */}
                <div className="border-t border-white/10 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] mt-4 flex items-center justify-between bg-background shrink-0">
                  {modalFooterBadge}
                  <button
                    type="button"
                    onClick={() => {
                      if (checkoutTriggerRef.current) checkoutTriggerRef.current();
                    }}
                    disabled={isPending}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-glow disabled:opacity-50"
                  >
                    {isPending ? 'Processing...' : 'Check out'}
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
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(quantities).map(([tierKey, qty]) => {
                          if (qty === 0) return null;
                          const tier = event.ticketTiers.find((t) => t.tier === tierKey);
                          if (!tier) return null;
                          const price = Math.max(0, tier.price - (tier.discount || 0));
                          return (
                            <div key={tierKey} className="flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-white">{qty}x</span>{' '}
                                <span className="text-text-secondary">{tier.name}</span>
                              </div>
                              <span className="font-semibold text-accent-purple-light">₹{price * qty}</span>
                            </div>
                          );
                        })}
                      </div>
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
        </Modal>

        {/* Desktop Checkout Modal overlay */}
        <Modal
          isOpen={isCheckoutModalOpen && !!checkoutBookingId}
          onClose={() => {
            setIsPending(false);
            setIsCheckoutModalOpen(false);
            setCheckoutBookingId(null);
          }}
          size="lg"
          showCloseButton={false}
          closeOnBackdropClick={true}
          ariaLabelledBy="checkout-modal-title"
          className="w-full h-full md:max-h-[95vh] max-w-4xl bg-background md:rounded-2xl border border-white/10 overflow-y-auto shadow-2xl relative z-10 p-6 custom-scrollbar focus:outline-none"
        >
              <CheckoutContent
                bookingId={checkoutBookingId}
                isModal={true}
                onBack={() => {
                  setIsPending(false);
                  setIsCheckoutModalOpen(false);
                  setIsBookingModalOpen(true);
                }}
                onClose={() => {
                  setIsPending(false);
                  setIsCheckoutModalOpen(false);
                  setCheckoutBookingId(null);
                }}
              />
        </Modal>
      </>
    );
  }
);
