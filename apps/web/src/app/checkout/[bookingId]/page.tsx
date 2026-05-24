'use client';

import { Button } from '@mad/ui';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicGetBookingDetails, publicCreatePaymentIntent, publicVerifyPayment } from '@/lib/api/public.service';


export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>('razorpay');
  const [error, setError] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  const { data: details, isLoading } = useQuery({
    queryKey: ['booking-checkout-details', bookingId],
    queryFn: () => publicGetBookingDetails(bookingId),
    enabled: !!bookingId,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const booking = details?.booking;

  // Redirect if already confirmed
  useEffect(() => {
    if (booking && booking.status === 'confirmed') {
      router.push(`/my-booking?ref=${booking.bookingId}`);
    }
  }, [booking, router]);

  const paymentIntentMutation = useMutation({
    mutationFn: (gateway: 'stripe' | 'razorpay') => publicCreatePaymentIntent(bookingId, gateway),
    onSuccess: async (res) => {

      if (res.gateway === 'razorpay') {
        if (res.isMock) {
          setIsProcessing(true);
          verifyPaymentMutation.mutate({
            razorpay_order_id: res.orderId,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(2, 10),
            razorpay_signature: 'mock_signature',
          });
          return;
        }

        const loadRazorpay = () =>
          new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });

        const resLoaded = await loadRazorpay();
        if (!resLoaded) {
          setError('Failed to load Razorpay SDK. Check your connection.');
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: 'MAD Entertainment',
          description: `Booking ${res.bookingId}`,
          order_id: res.orderId,
          handler: function (response: any) {
            setIsProcessing(true);
            verifyPaymentMutation.mutate({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: function () {
              setError('Payment cancelled by user');
              setIsProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
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
        setError('Stripe production integration requires Elements. Please use Razorpay for now.');
      }
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: any) => publicVerifyPayment(bookingId, payload),
    onSuccess: () => {
      router.push(`/my-booking?ref=${booking?.bookingId}`);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      setIsProcessing(false);
    },
  });

  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Trigger intent request
    paymentIntentMutation.mutate(selectedGateway);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-white/40 animate-pulse text-sm">Loading checkout details...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4 px-4">
        <div className="text-white font-bold text-lg">Booking Session Expired</div>
        <div className="text-text-muted text-sm max-w-md text-center">
          We couldn't find your booking session. It may have expired due to inactivity, or the link is invalid. Please start a new booking.
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={() => router.push('/events')}>
            Start New Booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container-mad max-w-4xl space-y-6 relative z-10">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h1 className="text-2xl font-black text-white">Review & Pay</h1>
          <p className="text-text-muted text-xs">Complete payment to confirm your seats and tickets.</p>
        </div>

        {error && (
          <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Order details & Billing */}
          <div className="md:col-span-7 space-y-6">
            {/* Booking Details */}
            <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider">Order Summary</h2>

              <div className="flex items-center justify-between pb-3 border-b border-border-subtle/50">
                <div>
                  <div className="text-white font-bold text-base">{booking.eventId ? (booking.eventId as any).title : 'Event Booking'}</div>
                  <div className="text-xs text-text-muted mt-0.5">Reference ID: {booking.bookingId}</div>
                </div>
              </div>

              {/* Tickets list */}
              <div className="space-y-3">
                {booking.tickets.map((t, idx) => {
                  const eventConfig = (booking.eventId as any)?.ticketTiers?.find((tier: any) => tier.tier === t.tier);
                  const groupSize = eventConfig?.groupSize || 1;
                  const discount = eventConfig?.discount || 0;
                  return (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{t.tierName}</span>
                          <span className="text-text-muted text-[10px]">x {t.quantity}</span>
                        </div>
                        {groupSize > 1 && (
                          <div className="text-emerald-400/80 font-medium text-[10px] mt-0.5">
                            Admits {groupSize * t.quantity} People
                          </div>
                        )}
                        {t.seats && t.seats.length > 0 && (
                          <div className="text-accent-purple-light font-mono text-[10px] mt-1">
                            Seats: {t.seats.map((s) => s.seatId).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {discount > 0 && (
                          <div className="line-through text-text-muted text-[10px]">
                            ₹{eventConfig.price * t.quantity}
                          </div>
                        )}
                        <div className="text-text-secondary font-medium">₹{t.subtotal}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-wider">Payment Method</h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedGateway('razorpay')}
                  className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                    selectedGateway === 'razorpay'
                      ? 'bg-accent-purple/10 border-accent-purple text-white'
                      : 'bg-white/2 border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary'
                  }`}
                >
                  <span className="text-2xl">💳</span>
                  <span className="text-xs font-semibold">Razorpay</span>
                  <span className="text-[9px] opacity-60">UPI, Net Banking, Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGateway('stripe')}
                  className={`p-4 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                    selectedGateway === 'stripe'
                      ? 'bg-accent-purple/10 border-accent-purple text-white'
                      : 'bg-white/2 border-white/5 text-text-muted hover:border-white/10 hover:text-text-secondary'
                  }`}
                >
                  <span className="text-2xl">🌍</span>
                  <span className="text-xs font-semibold">Stripe</span>
                  <span className="text-[9px] opacity-60">International Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Billing Price Breakdown */}
          <div className="md:col-span-5 glass rounded-2xl border border-border-subtle p-6 space-y-6">
            <h2 className="text-white font-bold text-sm uppercase tracking-wider">Payment Details</h2>

            <div className="space-y-3 text-xs border-b border-border-subtle/50 pb-4">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span>₹{booking.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Convenience Fee</span>
                <span>₹{booking.convenienceFee}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>GST (18%)</span>
                <span>₹{booking.gst}</span>
              </div>
              {booking.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span>-₹{booking.discount}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm font-black">
              <span className="text-white">Total Amount</span>
              <span className="text-accent-purple-light text-base">₹{booking.totalAmount}</span>
            </div>

            <form onSubmit={handlePayClick} className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={paymentIntentMutation.isPending || isProcessing}
              >
                Pay ₹{booking.totalAmount}
              </Button>
            </form>
          </div>
        </div>
      </div>

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
    </div>
  );
}
