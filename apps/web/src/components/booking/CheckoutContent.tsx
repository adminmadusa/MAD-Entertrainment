'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { QUERY_KEYS, BookingStatus } from '@mad/shared';
import { Event, Booking, Ticket } from '@mad/types';
import { useCountdown } from '@/hooks/use-countdown.hook';
import { useCheckoutViewportController } from '@/hooks/use-checkout-viewport-controller';
import { extractApiError } from '@/lib/api/client';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { 
  publicGetBookingDetails, 
  publicCreatePaymentIntent, 
  publicVerifyPayment, 
  publicSaveCheckoutDetails,
  getStoredGuestBookingSession,
  PaymentIntentResponse
} from '@/lib/api/public.service';
import { CheckoutDetailsInput } from '@mad/validations';

import { useCheckoutNavGuard } from './checkout/useCheckoutNavGuard';
const LeaveCheckoutModal = dynamic(() => import('./checkout/LeaveCheckoutModal').then(mod => mod.LeaveCheckoutModal), {
  ssr: false,
});
import { CheckoutForm } from './checkout/CheckoutForm';
import { CheckoutPricing } from './checkout/CheckoutPricing';
import { CheckoutPayment } from './checkout/CheckoutPayment';

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
  isModal: boolean;
  onBack: () => void;
  onClose: () => void;
}

export function CheckoutContent({ bookingId, isModal, onBack, onClose }: CheckoutContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

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
  const event = asEvent((booking as Booking | undefined)?.eventId);



  const handleViewTickets = () => {
    allowNavigation();
    router.push(`/tickets?ref=${booking?.bookingId}`);
    if (isModal) onClose();
  };

  const handleContinueBrowsing = () => {
    allowNavigation();
    router.push('/');
    if (isModal) onClose();
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
      <div className={isModal ? "relative text-white p-6 text-center space-y-6" : "pt-24 pb-24 min-h-screen bg-[#0d111d] text-white relative overflow-x-hidden flex flex-col items-center justify-center w-full px-4"}>
        {!isModal && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
        )}
        
        <div className="max-w-md w-full glass rounded-3xl border border-white/10 p-8 text-center space-y-6 shadow-glow relative z-10">
          {/* Glowing Checkmark */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse">
              ✓
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-wide">Booking Confirmed!</h2>
            {event?.title && (
              <p className="text-accent-cyan font-bold text-sm">{event.title}</p>
            )}
            <p className="text-text-secondary text-xs">
              Thank you for your purchase. Your order has been processed successfully.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-background/50 border border-white/5 rounded-2xl p-4 space-y-1.5 font-mono">
            <div className="text-[10px] text-text-secondary font-medium tracking-wider uppercase font-sans">Booking Reference ID</div>
            <div className="text-lg font-black text-white tracking-wider select-all">{booking.bookingId}</div>
          </div>

          {/* Emailed Confirmation */}
          <p className="text-xs text-text-muted leading-relaxed">
            We have sent your confirmation email and tickets to <span className="text-white font-semibold">{booking.guestEmail || 'your email'}</span>.
          </p>



          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={handleViewTickets}
              className="w-full py-3 btn-gradient text-white font-black text-sm rounded-xl shadow-glow transition-transform active:scale-[0.98] hover:scale-[1.01]"
            >
              View Tickets
            </button>
            <button
              onClick={handleContinueBrowsing}
              className="w-full py-3 border border-white/10 hover:bg-white/5 text-white/95 font-bold text-sm rounded-xl transition-all active:scale-[0.98]"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-transparent">
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
    <div className={isModal ? "relative text-white" : "pt-24 pb-24 min-h-screen bg-[#0d111d] text-white relative overflow-x-hidden flex flex-col items-center justify-center"}>
      {!isModal && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-[150px] pointer-events-none" />
      )}

      {/* Sticky Top Checkout Header */}
      <div className={isModal ? "sticky top-0 bg-[#0d111d] border-b border-white/10 py-3 z-50 shadow-md" : "fixed top-0 left-0 right-0 bg-[#0d111d]/90 backdrop-blur-md border-b border-white/10 py-3 z-50 shadow-md"}>
        <div className="container-mad max-w-4xl px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackClick}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg transition-colors"
            aria-label="Go back"
          >
            ←
          </button>
          
          <div className="text-center">
            <h1 id="checkout-modal-title" className="text-sm font-bold text-white tracking-wide">Checkout</h1>
            <div className={`text-[10px] font-semibold mt-0.5 ${isExpired ? 'text-red-400' : 'text-accent-cyan animate-pulse'}`}>
              {timeLeft}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            className="w-10 h-10 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white text-sm transition-colors"
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
                  <p className="text-xs text-accent-purple-light font-bold">₹{booking.totalAmount}</p>
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

          {/* Right Column: Checkout Breakdown, Payment Details, and Actions */}
          <div className="lg:col-span-4 space-y-4">
            <CheckoutPricing booking={booking} />

            <CheckoutPayment
              selectedGateway={selectedGateway}
              onChangeGateway={setSelectedGateway}
            />

            {/* Place Order & Terms (Always Visible) */}
            <div className="glass rounded-2xl border border-white/5 p-5 space-y-3">
              <button
                type="submit"
                form="checkout-form"
                disabled={isExpired || saveDetailsMutation.isPending || paymentIntentMutation.isPending || isProcessing}
                className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-glow disabled:opacity-50"
              >
                {buttonText}
              </button>

              <div className="pt-3 border-t border-white/5 space-y-3">
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
        <div className={isModal ? "sticky bottom-0 z-40 bg-[#0d111d]/95 border-t border-white/10 py-3 mt-8 shadow-2xl lg:hidden" : "fixed bottom-0 left-0 right-0 z-40 bg-[#0d111d]/95 backdrop-blur-lg border-t border-white/10 shadow-2xl lg:hidden"}>
          <div className="container-mad max-w-4xl px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Total Amount</div>
              <div className="text-white font-black text-lg">₹{booking.totalAmount}</div>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[100] space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-accent-purple border-t-transparent animate-spin" />
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
