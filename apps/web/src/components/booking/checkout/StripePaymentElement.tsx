'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { useState, useMemo } from 'react';

import { Spinner } from '@mad/ui';

interface StripePaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onError: (errorMessage: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

function StripeCheckoutForm({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe payment provider is not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    onError('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment confirmation failed. Please check your card details.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else {
        onError(`Payment not completed. Status: ${paymentIntent?.status || 'unknown'}`);
        setIsProcessing(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected payment error occurred.';
      onError(message);
      setIsProcessing(false);
    }
  };

  return (
    <form id="stripe-payment-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="relative min-h-[160px]">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl" role="status" aria-live="polite">
            <Spinner size="md" className="text-accent-purple" aria-label="Loading secure payment form" />
          </div>
        )}
        <PaymentElement
          id="stripe-payment-element"
          onReady={() => setIsReady(true)}
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || !isReady || isProcessing}
        className="w-full min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple-light hover:to-accent-pink/80 text-white font-black text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isProcessing ? (
          <>
            <Spinner size="sm" className="text-white" aria-hidden="true" />
            <span>Confirming Payment...</span>
          </>
        ) : (
          <span>Pay & Confirm Order</span>
        )}
      </button>
    </form>
  );
}

interface StripePaymentElementProps {
  publishableKey: string;
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (errorMessage: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  let cached = stripePromiseCache.get(publishableKey);
  if (!cached) {
    cached = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, cached);
  }
  return cached;
}

export function StripePaymentElement({
  publishableKey,
  clientSecret,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: StripePaymentElementProps) {
  const stripePromise = useMemo(() => getStripePromise(publishableKey), [publishableKey]);

  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#8b5cf6',
          colorBackground: '#0a0a0f',
          colorText: '#ffffff',
          colorDanger: '#f87171',
          fontFamily: 'Inter, system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '12px',
        },
        rules: {
          '.Input': {
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            boxShadow: 'none',
          },
          '.Input:focus': {
            border: '1px solid #8b5cf6',
            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.25)',
          },
          '.Tab': {
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
          '.Tab--selected': {
            border: '1px solid #8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
          },
        },
      },
    }),
    [clientSecret]
  );

  return (
    <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h3 className="text-white font-bold text-sm sm:text-base">Payment Details</h3>
        <span className="text-[10px] text-accent-cyan font-semibold flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-accent-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Encrypted via Stripe
        </span>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <StripeCheckoutForm
          onSuccess={onSuccess}
          onError={onError}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />
      </Elements>
    </div>
  );
}
