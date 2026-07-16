'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
    const [isPending, setIsPending] = useState(false);
    const checkoutTriggerRef = useRef<(() => void) | null>(null);

    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutBookingId, setCheckoutBookingId] = useState<string | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);

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

    return (
      <>
        {/* Ticket Selection Modal overlay */}
        <Modal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          size="lg"
          showCloseButton={true}
          presentation="bottom-sheet"
          closeOnBackdropClick={true}
          ariaLabelledBy="booking-modal-title"
          className="md:h-[650px] max-w-4xl bg-background md:rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl z-10 focus:outline-none p-0"
        >
          <TicketSelectionContent
            event={event}
            isModal={true}
            showDateTime={showDateTime}
            onClose={() => setIsBookingModalOpen(false)}
            checkoutTriggerRef={checkoutTriggerRef}
            setIsPendingChange={setIsPending}
            onBookingSuccess={(bookingId) => {
              setCheckoutBookingId(bookingId);
              setIsCheckoutModalOpen(true);
            }}
          />
        </Modal>


        {/* Desktop Checkout Modal overlay */}
        <Modal
          isOpen={isCheckoutModalOpen && !!checkoutBookingId}
          onClose={() => {
            setIsPending(false);
            setIsCheckoutModalOpen(false);
            setCheckoutBookingId(null);
            setIsConfirmed(false);
          }}
          size={isConfirmed ? "sm" : "lg"}
          showCloseButton={false}
          presentation="bottom-sheet"
          closeOnBackdropClick={true}
          ariaLabelledBy="checkout-modal-title"
          className={
            isConfirmed
              ? "max-w-md bg-background md:rounded-2xl border border-white/10 shadow-2xl relative z-10 p-6 focus:outline-none animate-in fade-in zoom-in-95 duration-300"
              : "md:max-h-[95vh] max-w-4xl bg-background md:rounded-2xl border border-white/10 overflow-y-auto shadow-2xl relative z-10 p-6 custom-scrollbar focus:outline-none"
          }
        >
              <CheckoutContent
                bookingId={checkoutBookingId}
                isModal={true}
                onConfirmed={() => setIsConfirmed(true)}
                onBack={() => {
                  setIsPending(false);
                  setIsCheckoutModalOpen(false);
                  setIsBookingModalOpen(true);
                }}
                onClose={() => {
                  setIsPending(false);
                  setIsCheckoutModalOpen(false);
                  setCheckoutBookingId(null);
                  setIsConfirmed(false);
                }}
              />
        </Modal>
      </>
    );
  }
);
