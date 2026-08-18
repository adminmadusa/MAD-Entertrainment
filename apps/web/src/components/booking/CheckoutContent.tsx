'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useCheckoutViewportController } from '@/hooks/use-checkout-viewport-controller';
import { useCountdown } from '@/hooks/use-countdown.hook';
import { extractApiError } from '@/lib/api/client';
import { publicGetBookingDetails, publicCreatePaymentIntent, publicVerifyPayment, publicSaveCheckoutDetails, getStoredGuestBookingSession, type PaymentIntentResponse } from '@/lib/api/public.service';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { useAuth } from '@/providers/AuthProvider';
import { BookingStatus, QUERY_KEYS, formatMoney } from '@mad/shared';
import type { Booking, Event, Ticket } from '@mad/types';
import { Spinner } from '@mad/ui';
import { CheckoutDetailsInput } from '@mad/validations';

import { CheckoutForm } from './checkout/CheckoutForm';
import { CheckoutPricing } from './checkout/CheckoutPricing';
import { useCheckoutNavGuard } from './checkout/useCheckoutNavGuard';
import { CheckoutConfirmationView } from './CheckoutConfirmationView';

const LeaveCheckoutModal = dynamic(() => import('./checkout/LeaveCheckoutModal').then(mod => mod.LeaveCheckoutModal), {
  ssr: false,
});

interface RazorpayInstance {
  open(): void;
  on(event: string, callback: (response: { error: { description: string } }) => void): void;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: unknown) => RazorpayInstance;
}

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

export function CheckoutContent({ bookingId, isModal, onBack, onClose, onConfirmed }: CheckoutContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>('razorpay');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Dynamically select gateway based on booking currency (INR -> Razorpay, others -> Stripe)
  useEffect(() => {
    if (booking?.currency) {
      const isINR = booking.currency.toUpperCase() === 'INR';
      setSelectedGateway(isINR ? 'razorpay' : 'stripe');
    }
  }, [booking?.currency]);

  // Trigger onConfirmed when booking status is confirmed
  useEffect(() => {
    if (booking && booking.status === BookingStatus.CONFIRMED && onConfirmed) {
      onConfirmed();
    }
  }, [booking, onConfirmed]);

  const handleViewTickets = () => {
    allowNavigation();
    if (isAuthenticated) {
      router.push(`/dashboard?tab=tickets&ref=${booking?.bookingId}`);
      if (isModal && onClose) onClose();
    } else {
      const ticketsSection = document.getElementById('confirmation-tickets-section');
      if (ticketsSection) {
        ticketsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };


  const countdown = useCountdown(booking?.logicalExpiresAt || booking?.expiresAt);
  const isExpired = countdown.isExpired;
  const timeLeft = isExpired
    ? 'Expired'
    : `Time left ${countdown.minutes}:${String(countdown.seconds).padStart(2, '0')}`;

  // Save checkout details mutation
  const saveDetailsMutation = useMutation({
    mutationFn: (payload: CheckoutDetailsInput) => {
      const sessionToken = getStoredGuestBookingSession()?.token || '';
      return publicSaveCheckoutDetails(bookingId, payload, sessionToken);
    },
    onSuccess: () => {
      paymentIntentMutation.mutate(selectedGateway);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  // Payment Intent Mutation
  const paymentIntentMutation = useMutation({
    mutationFn: (gateway: 'stripe' | 'razorpay') => {
      const sessionToken = getStoredGuestBookingSession()?.token;
      return publicCreatePaymentIntent(bookingId, gateway, sessionToken);
    },
    onSuccess: async (res: PaymentIntentResponse) => {
      if (res.isFree) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.public.bookings.checkout(bookingId)
        });
        return;
      }

      if (res.gateway === 'razorpay') {
        if (res.isMock) {
          setIsProcessing(true);
          // eslint-disable-next-line no-restricted-syntax
          const mockPaymentId = 'pay_mock_' + Math.random().toString(36).substring(2, 10);
          verifyPaymentMutation.mutate({
            razorpay_order_id: res.orderId,
            razorpay_payment_id: mockPaymentId,
            razorpay_signature: 'mock_signature',
          });
          return;
        }

        try {
          await loadScriptOnce('https://checkout.razorpay.com/v1/checkout.js');
        } catch {
          setError('Failed to load Razorpay SDK. Check your connection.');
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: 'MAD Entertainment',
          description: `Booking ID: ${bookingId}`,
          order_id: res.orderId,
          handler: (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setIsProcessing(true);
            verifyPaymentMutation.mutate({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: `${booking.firstName} ${booking.lastName}`,
            email: booking.guestEmail,
          },
          theme: {
            // governance-ignore VAL-UI-007: Razorpay payment gateway API requires a literal hex color value; CSS variables are not supported by this external SDK
            color: '#8b5cf6',
          },
          modal: {
            ondismiss: function () {
              setError('Payment cancelled by user');
              setIsProcessing(false);
            },
          },
        };

        const Razorpay = (window as RazorpayWindow).Razorpay;
        if (!Razorpay) {
          setError('Razorpay SDK is unavailable. Please retry.');
          return;
        }
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setError(`Payment Failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzp.open();
      } else if (res.gateway === 'stripe') {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            paymentIntentId: res.clientSecret ? res.clientSecret.split('_secret')[0] : 'pi_mock_fallback',
          });
          return;
        }
        setError('Stripe production integration requires Elements. Please use Razorpay/PayPal for now.');
      }
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => publicVerifyPayment(bookingId, payload),
    onSuccess: (confirmedBooking) => {
      queryClient.setQueryData(
        QUERY_KEYS.public.bookings.checkout(bookingId),
        (oldData: { booking: Booking; tickets: Ticket[]; ticketsReady: boolean } | undefined) => {
          if (!oldData) {
            return {
              booking: confirmedBooking,
              tickets: [],
              ticketsReady: false,
            };
          }
          return {
            ...oldData,
            booking: {
              ...confirmedBooking,
              eventId: oldData.booking?.eventId || confirmedBooking.eventId,
            },
          };
        }
      );
      setIsProcessing(false);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      setIsProcessing(false);
    },
  });

  let buttonText = 'Place Order';
  if (saveDetailsMutation.isPending || paymentIntentMutation.isPending || isProcessing) {
    buttonText = 'Processing...';
  } else if (isExpired) {
    buttonText = 'Session Expired';
  }

  const handleFormSubmit = (detailsPayload: CheckoutDetailsInput) => {
    saveDetailsMutation.mutate(detailsPayload);
  };

  if (booking && booking.status === BookingStatus.CONFIRMED) {
    return (
      <CheckoutConfirmationView
        booking={booking}
        event={event}
        isModal={isModal}
        currency={currency}
        onViewTickets={handleViewTickets}
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
    return (
      <div className="flex flex-col items-center justify-center space-y-4 px-4 py-12 text-center bg-transparent">
        <div className="text-white font-bold text-lg">Booking Session Expired</div>
        <p className="text-text-muted text-sm max-w-md">
          We couldn't find your booking details. It may have expired due to inactivity. Please select tickets again.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-3 btn-gradient text-white rounded-xl font-bold text-sm shadow-glow-sm transition-transform active:scale-95"
        >
          Start New Booking
        </button>
      </div>
    );
  }

  return (
    <div className={isModal ? "relative text-white" : "pt-24 pb-24 min-h-screen bg-background text-white relative overflow-x-hidden flex flex-col items-center justify-center"}>
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      {/* Sticky Top Checkout Header */}
      <div className={isModal ? "sticky top-0 bg-background border-b border-white/10 py-3 z-50 shadow-md" : "fixed top-0 left-0 right-0 bg-background/90 backdrop-blur-md border-b border-white/10 py-3 z-50 shadow-md"}>
        <div className="container-mad max-w-4xl px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackClick}
            className="w-11 h-11 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg transition-colors shrink-0"
            aria-label="Go back"
          >
            ←
          </button>

          <div className="text-center min-w-0 flex-1 px-2">
            <h1 id="checkout-modal-title" className="text-xs md:text-sm font-bold text-white tracking-wide truncate">Checkout</h1>
            <div className={`text-[10px] font-semibold mt-0.5 ${isExpired ? 'text-red-400' : 'text-accent-cyan animate-pulse'}`}>
              {timeLeft}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            className="w-11 h-11 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm transition-colors shrink-0"
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={isModal ? "space-y-4 relative z-10 mt-4" : "container-mad max-w-4xl space-y-4 relative z-10 px-4 mt-20 w-full"}>
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Event summary card & Billing details */}
          <div className="lg:col-span-8 space-y-4">

            {/* Event Summary Card */}
            {event && (
              <div className="glass rounded-2xl border border-white/5 p-4 flex gap-4 items-center">
                {event.bannerImage?.url && (
                  <div className="relative w-20 h-20 bg-black/20 rounded-xl border border-white/10 overflow-hidden">
                    <Image src={event.bannerImage.url} alt={event.title} fill sizes="80px" className="object-contain" />
                  </div>
                )}
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-white line-clamp-1">{event.title}</h2>
                  <p className="text-xs text-text-muted">
                    {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })} · {event.showTime}
                  </p>
                  <p className="text-xs text-accent-purple-light font-bold">{formatMoney(booking.totalAmount, currency)}</p>
                </div>
              </div>
            )}

            {/* Billing Information Form */}
            <div>
              <CheckoutForm
                event={event}
                isExpired={isExpired}
                isDisabled={isProcessing || saveDetailsMutation.isPending || paymentIntentMutation.isPending}
                onSubmit={handleFormSubmit}
                onErrorSet={setError}
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <CheckoutPricing booking={booking} />

            {/* Place Order & Terms */}
            <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
              <button
                type="submit"
                form="checkout-form"
                disabled={isExpired || saveDetailsMutation.isPending || paymentIntentMutation.isPending || isProcessing}
                className="hidden lg:block w-full px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50"
              >
                {buttonText}
              </button>

              <div className="pt-0 lg:pt-3 border-t-0 lg:border-t border-white/5 space-y-3">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-secondary font-medium bg-white/5 py-2 rounded-lg border border-white/5">
                  <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure checkout · No hidden fees</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed text-center">
                  By selecting Place Order, I agree to the MAD Entertainment Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Place Order Footer (Mobile Only) */}
      {!viewport.isKeyboardOpen && (
        <div className={isModal ? "sticky bottom-0 z-40 bg-background/95 border-t border-white/10 py-2 mt-4 shadow-2xl lg:hidden" : "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-white/10 shadow-2xl lg:hidden"}>
          <div className={`container-mad max-w-4xl px-4 flex items-center gap-4 ${isModal ? 'py-2' : 'py-3 pb-[calc(1rem+env(safe-area-inset-bottom))]'}`}>
            <div className="flex-1">
              <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Total Amount</div>
              <div className="text-white font-black text-lg">{formatMoney(booking.totalAmount, currency)}</div>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={isExpired || saveDetailsMutation.isPending || paymentIntentMutation.isPending || isProcessing}
              className="flex-shrink-0 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50"
            >
              {buttonText}
            </button>
          </div>
        </div>
      )}

      {/* Payment Processing Loader Backdrop */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-dialog space-y-4" role="status" aria-live="assertive">
            <Spinner size="lg" className="text-accent-purple" aria-label="Verifying payment with bank servers" />
            <p className="text-white font-bold text-sm tracking-wider">Verifying payment with bank servers...</p>
            <p className="text-text-muted text-xs">Please do not refresh this page.</p>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Checkout Confirmation Modal */}
      <LeaveCheckoutModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeave}
      />
    </div>
  );
}
