'use client';

import React from 'react';

import { Modal } from '@mad/ui';

interface FindTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingRefInput: string;
  setBookingRefInput: (val: string) => void;
  transactionIdInput: string;
  setTransactionIdInput: (val: string) => void;
  isSubmitting: boolean;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
  onOpenSupport: () => void;
}

export function FindTicketsModal({
  isOpen,
  onClose,
  bookingRefInput,
  setBookingRefInput,
  transactionIdInput,
  setTransactionIdInput,
  isSubmitting,
  errorMsg,
  onSubmit,
  onOpenSupport,
}: FindTicketsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={true}
      enableSwipeToClose={true}
      ariaLabelledBy="find-title"
      ariaDescribedBy="find-desc"
    >
      <div className="space-y-6">
        <div className="text-center">
          <h2 id="find-title" className="text-2xl font-black text-white tracking-tight">
            My Tickets
          </h2>
          <p id="find-desc" className="text-text-secondary text-sm mt-1.5 leading-relaxed">
            Retrieve your booking using either reference ID or transaction ID.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" aria-live="assertive" className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 text-center font-medium animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="bookingRef" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Booking Reference
            </label>
            <input
              id="bookingRef"
              type="text"
              value={bookingRefInput}
              onChange={(e) => {
                setBookingRefInput(e.target.value);
                if (e.target.value) setTransactionIdInput('');
              }}
              placeholder="e.g. MAD-2026-ABCDE"
              disabled={isSubmitting}
              aria-invalid={!!errorMsg && !transactionIdInput}
              aria-describedby={errorMsg && !transactionIdInput ? "find-error-message" : undefined}
              className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all font-mono uppercase tracking-wider"
            />
          </div>

          <div className="flex items-center py-2">
            <div className="flex-grow border-t border-border-subtle/30" />
            <span className="mx-4 text-xs font-bold text-text-muted/40 uppercase tracking-widest">or</span>
            <div className="flex-grow border-t border-border-subtle/30" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="transactionId" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Payment / Transaction ID
            </label>
            <input
              id="transactionId"
              type="text"
              value={transactionIdInput}
              onChange={(e) => {
                setTransactionIdInput(e.target.value);
                if (e.target.value) setBookingRefInput('');
              }}
              placeholder="e.g. pay_xxxxxxxxxxxx"
              disabled={isSubmitting}
              aria-invalid={!!errorMsg && !bookingRefInput}
              aria-describedby={errorMsg && !bookingRefInput ? "find-error-message" : undefined}
              className="w-full bg-white/5 border border-border-subtle rounded-xl px-4 py-3 text-base lg:text-sm text-white placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all font-mono tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!bookingRefInput.trim() && !transactionIdInput.trim())}
            aria-label="Find Tickets"
            className="w-full py-3.5 rounded-xl font-bold tracking-wide btn-gradient text-white shadow-lg active:scale-98 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding Tickets...
              </>
            ) : (
              'Find Tickets'
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onOpenSupport}
            className="text-xs font-semibold text-text-muted hover:text-white transition-colors py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded"
          >
            Having issues? Contact Support
          </button>
        </div>
      </div>
    </Modal>
  );
}
