'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extractApiError } from '@/lib/api/client';
import {
  publicCreatePaymentIntent,
  publicVerifyPayment,
  publicSaveCheckoutDetails,
  publicGetBookingDetails,
  getStoredGuestBookingSession,
  type PaymentIntentResponse,
} from '@/lib/api/public.service';
import { loadScriptOnce } from '@/lib/utils/load-script-once';
import { useAuth } from '@/providers/AuthProvider';
import { QUERY_KEYS } from '@mad/shared';
import type { Booking, Ticket } from '@mad/types';
import type { CheckoutDetailsInput } from '@mad/validations';

interface RazorpayInstance {
  open(): void;
  on(event: string, callback: (response: { error: { description: string } }) => void): void;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: unknown) => RazorpayInstance;
}

interface UseCheckoutPaymentFlowProps {
  bookingId: string;
  booking: Booking | undefined;
}

export function useCheckoutPaymentFlow({ bookingId, booking }: UseCheckoutPaymentFlowProps) {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  const [selectedGateway, setSelectedGateway] = useState<'stripe' | 'razorpay'>('razorpay');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMockPaymentNotice, setIsMockPaymentNotice] = useState(false);
  const [stripeData, setStripeData] = useState<{ clientSecret: string; publishableKey: string } | null>(null);

  // Dynamically select gateway based on booking currency (INR -> Razorpay, others -> Stripe)
  useEffect(() => {
    if (booking?.currency) {
      const isINR = booking.currency.toUpperCase() === 'INR';
      setSelectedGateway(isINR ? 'razorpay' : 'stripe');
    }
  }, [booking?.currency]);

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
          queryKey: QUERY_KEYS.public.bookings.checkout(bookingId),
        });
        return;
      }

      if (res.gateway === 'razorpay') {
        if (res.isMock) {
          setIsProcessing(true);
          const mockPaymentId = `pay_mock_${Date.now().toString(36)}_${bookingId.slice(-6)}`;
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
            name: booking ? `${booking.firstName} ${booking.lastName}` : undefined,
            email: booking?.guestEmail,
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
          setIsMockPaymentNotice(true);
          setIsProcessing(true);
          const mockIntentId = res.clientSecret ? res.clientSecret.split('_secret')[0] : 'pi_mock_fallback';
          setTimeout(() => {
            verifyPaymentMutation.mutate({
              paymentIntentId: mockIntentId,
            });
          }, 350);
          return;
        }

        const pubKey = res.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (res.clientSecret && pubKey) {
          setStripeData({
            clientSecret: res.clientSecret,
            publishableKey: pubKey,
          });
        } else {
          setError('Stripe initialization details missing from server response.');
        }
      }
    },
    onError: (err) => {
      setError(extractApiError(err).message);
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => publicVerifyPayment(bookingId, payload),
    onSuccess: async (verifyRes) => {
      const confirmedBooking = verifyRes.booking || (verifyRes as unknown as Booking);
      if (verifyRes.token && verifyRes.user) {
        login(verifyRes.token, verifyRes.user);
      }
      try {
        const sessionToken = getStoredGuestBookingSession()?.token;
        const freshDetails = await publicGetBookingDetails(bookingId, sessionToken);
        if (freshDetails) {
          queryClient.setQueryData(QUERY_KEYS.public.bookings.checkout(bookingId), freshDetails);
        }
      } catch (_err) {
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
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.public.bookings.checkout(bookingId) });
      setIsProcessing(false);
      setIsMockPaymentNotice(false);
    },
    onError: (err) => {
      setError(extractApiError(err).message);
      setIsProcessing(false);
      setIsMockPaymentNotice(false);
    },
  });

  const handleFormSubmit = (detailsPayload: CheckoutDetailsInput) => {
    saveDetailsMutation.mutate(detailsPayload);
  };

  return {
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
  };
}
