'use client';

import { AnimatePresence } from 'framer-motion';
import { Spinner } from '@mad/ui';

interface CheckoutProcessingBackdropProps {
  isProcessing: boolean;
  isMockPaymentNotice: boolean;
}

export function CheckoutProcessingBackdrop({
  isProcessing,
  isMockPaymentNotice,
}: CheckoutProcessingBackdropProps) {
  return (
    <AnimatePresence>
      {isProcessing && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-dialog space-y-4 text-center px-4"
          role="status"
          aria-live="assertive"
        >
          <Spinner size="lg" className="text-accent-purple" aria-label="Verifying payment" />
          <p className="text-white font-bold text-sm tracking-wider">
            {isMockPaymentNotice
              ? 'Simulating payment verification (Development Mock Mode)...'
              : 'Verifying payment with bank servers...'}
          </p>
          <p className="text-text-muted text-xs">
            {isMockPaymentNotice
              ? 'Mock payments active. Bypassing external gateways.'
              : 'Please do not refresh this page.'}
          </p>
        </div>
      )}
    </AnimatePresence>
  );
}
