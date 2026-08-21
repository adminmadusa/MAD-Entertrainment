'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useCheckoutViewportController } from '@/hooks/use-checkout-viewport-controller';
import { useCountdown } from '@/hooks/use-countdown.hook';
import { publicGetBookingDetails, getStoredGuestBookingSession } from '@/lib/api/public.service';
import { BookingStatus, QUERY_KEYS } from '@mad/shared';
import type { Booking, Event } from '@mad/types';

import { CheckoutForm } from './checkout/CheckoutForm';
import { CheckoutPricing } from './checkout/CheckoutPricing';
import { StripePaymentElement } from './checkout/StripePaymentElement';
import { useCheckoutNavGuard } from './checkout/useCheckoutNavGuard';
import { useCheckoutPaymentFlow } from './checkout/useCheckoutPaymentFlow';
import { CheckoutTopbar } from './checkout/CheckoutTopbar';
import { CheckoutEventSummaryCard } from './checkout/CheckoutEventSummaryCard';
import { CheckoutDesktopOrderBox } from './checkout/CheckoutDesktopOrderBox';
import { CheckoutMobileFooter } from './checkout/CheckoutMobileFooter';
import { CheckoutProcessingBackdrop } from './checkout/CheckoutProcessingBackdrop';
import { CheckoutExpiredSessionView } from './checkout/CheckoutExpiredSessionView';
import { CheckoutConfirmationView } from './CheckoutConfirmationView';

const LeaveCheckoutModal = dynamic(
  () => import('./checkout/LeaveCheckoutModal').then((mod) => mod.LeaveCheckoutModal),
  { ssr: false }
);

function asEvent(value: unknown): Event | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('title' in value) || !('startDate' in value)) return null;
  return value as Event;
}

interface CheckoutContentProps {
  bookingId: string;
  isModal?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onConfirmed?: () => void;
}

export function CheckoutContent({
  bookingId,
  isModal,
  onBack,
  onClose,
  onConfirmed,
}: CheckoutContentProps) {
  const router = useRouter();
  const viewport = useCheckoutViewportController();

  const {
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    handleBackClick,
    handleCloseClick,
    handleConfirmLeave,
    allowNavigation,
  } = useCheckoutNavGuard({ isModal, onBack, onClose });

  const { data: details, isLoading } = useQuery({
    queryKey: QUERY_KEYS.public.bookings.checkout(bookingId),
    queryFn: () => {
      const sessionToken = getStoredGuestBookingSession()?.token;
      return publicGetBookingDetails(bookingId, sessionToken);
    },
    enabled: !!bookingId,
    retry: (failureCount, error: unknown) => {
      if ((error as { response?: { status: number } })?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const booking = details?.booking;
  const tickets = details?.tickets || [];
  const ticketsReady = details?.ticketsReady ?? false;
  const currency = booking?.currency || 'USD';
  const event = asEvent((booking as Booking | undefined)?.eventId);

  const {
    error,
    setError,
    isProcessing,
    setIsProcessing,
    isMockPaymentNotice,
    stripeData,
    setStripeData,
    saveDetailsMutation,
    paymentIntentMutation,
    verifyPaymentMutation,
    handleFormSubmit,
  } = useCheckoutPaymentFlow({ bookingId, booking });

  useEffect(() => {
    if (booking && booking.status === BookingStatus.CONFIRMED && onConfirmed) {
      onConfirmed();
    }
  }, [booking, onConfirmed]);

  const handleViewTickets = () => {
    allowNavigation();
    router.push(`/dashboard?tab=tickets&ref=${encodeURIComponent(booking?.bookingId || '')}`);
    if (isModal && onClose) onClose();
  };

  const countdown = useCountdown(booking?.logicalExpiresAt || booking?.expiresAt);
  const isExpired = countdown.isExpired;
  const timeLeft = isExpired
    ? 'Expired'
    : `Time left ${countdown.minutes}:${String(countdown.seconds).padStart(2, '0')}`;

  const isFormDisabled =
    isProcessing || saveDetailsMutation.isPending || paymentIntentMutation.isPending;

  let buttonText = 'Place Order';
  if (isFormDisabled) {
    buttonText = 'Processing...';
  } else if (isExpired) {
    buttonText = 'Session Expired';
  }

  if (booking && booking.status === BookingStatus.CONFIRMED) {
    return (
      <CheckoutConfirmationView
        booking={booking}
        event={event}
        isModal={isModal}
        currency={currency}
        onViewTickets={handleViewTickets}
        onClose={onClose}
        tickets={tickets}
        ticketsReady={ticketsReady}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-transparent" role="status" aria-live="polite">
        <div className="text-white/40 animate-pulse text-sm">Loading checkout...</div>
      </div>
    );
  }

  if (!booking) {
    return <CheckoutExpiredSessionView onClose={onClose} />;
  }

  return (
    <div
      className={
        isModal
          ? 'flex flex-col h-full overflow-hidden text-white bg-background relative'
          : 'pt-16 pb-24 min-h-screen bg-background text-white relative overflow-x-hidden flex flex-col items-center justify-center'
      }
    >
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      {/* Pinned Topbar */}
      <CheckoutTopbar
        isModal={isModal}
        timeLeft={timeLeft}
        isExpired={isExpired}
        onBackClick={handleBackClick}
        onCloseClick={handleCloseClick}
      />

      {/* Scrollable Middle Body */}
      <div
        className={
          isModal
            ? 'flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3'
            : 'container-mad max-w-4xl space-y-4 relative z-10 px-4 mt-16 pb-28 w-full'
        }
      >
        {error && (
          <div
            className="py-2 px-3 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400 text-center"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left Column: Event summary card & Billing details */}
          <div className="lg:col-span-8 space-y-3">
            {event && (
              <CheckoutEventSummaryCard
                event={event}
                totalAmount={booking.totalAmount}
                currency={currency}
              />
            )}

            <div>
              {stripeData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <button
                      type="button"
                      onClick={() => setStripeData(null)}
                      className="text-xs text-accent-purple-light hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      ← Edit billing info
                    </button>
                  </div>
                  <StripePaymentElement
                    publishableKey={stripeData.publishableKey}
                    clientSecret={stripeData.clientSecret}
                    onSuccess={(paymentIntentId) => {
                      setIsProcessing(true);
                      verifyPaymentMutation.mutate({ paymentIntentId });
                    }}
                    onError={(errMessage) => {
                      setError(errMessage);
                      setIsProcessing(false);
                    }}
                    isProcessing={isProcessing || verifyPaymentMutation.isPending}
                    setIsProcessing={setIsProcessing}
                  />
                </div>
              ) : (
                <CheckoutForm
                  event={event}
                  isExpired={isExpired}
                  isDisabled={isFormDisabled}
                  onSubmit={handleFormSubmit}
                  onErrorSet={setError}
                />
              )}
            </div>
          </div>

          {/* Right Column: Pricing breakdown & Desktop submit */}
          <div className="lg:col-span-4 space-y-3">
            <CheckoutPricing booking={booking} />

            <CheckoutDesktopOrderBox
              hasStripeData={!!stripeData}
              isExpired={isExpired}
              isFormDisabled={isFormDisabled}
              buttonText={buttonText}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <CheckoutMobileFooter
        isModal={isModal}
        totalAmount={booking.totalAmount}
        currency={currency}
        hasStripeData={!!stripeData}
        isExpired={isExpired}
        isDisabled={isFormDisabled}
        buttonText={buttonText}
        isKeyboardOpen={viewport.isKeyboardOpen}
      />

      {/* Payment Processing Loader Backdrop */}
      <CheckoutProcessingBackdrop
        isProcessing={isProcessing}
        isMockPaymentNotice={isMockPaymentNotice}
      />

      {/* Leave Checkout Confirmation Modal */}
      <LeaveCheckoutModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
      />
    </div>
  );
}
