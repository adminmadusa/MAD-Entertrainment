'use client';

import { useState } from 'react';

import { AdminBooking } from '@/lib/api/admin/booking.service';
import { Modal } from '@mad/ui';

export interface CancelBookingModalProps {
  booking: AdminBooking;
  ticketIds?: string[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, ticketIds?: string[], refundAmount?: number) => void;
  isPending: boolean;
}

export default function CancelBookingModal({
  booking,
  ticketIds,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: CancelBookingModalProps) {
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isPaid = booking.totalAmount > 0;

  if (!isOpen) return null;

  const handleSubmit = () => {
    setHasSubmitted(true);
    onSubmit(
      cancelReason,
      ticketIds,
      isPaid && refundAmount ? parseFloat(refundAmount) : undefined
    );
  };

  const isSubmitDisabled = isPending || hasSubmitted || (isPaid && (!refundAmount || isNaN(parseFloat(refundAmount)) || parseFloat(refundAmount) < 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="cancel-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm space-y-4"
    >
      <h3 id="cancel-modal-title" className="text-white font-bold">
        {ticketIds && ticketIds.length > 0 ? 'Cancel Selected Tickets' : 'Cancel Booking'}
      </h3>
      <p className="text-text-secondary text-sm">
        {ticketIds && ticketIds.length > 0 ? (
          <>
            <span className="text-accent-purple font-mono">{ticketIds.length}</span> tickets from booking <span className="text-accent-purple font-mono">{booking.bookingId}</span> will be cancelled.
          </>
        ) : (
          <>
            Booking <span className="text-accent-purple font-mono">{booking.bookingId}</span> will be cancelled.
          </>
        )}
      </p>

      {isPaid && (
        <div className="space-y-1.5 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <label className="text-sm text-yellow-400 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Request Refund Amount
          </label>
          <p className="text-xs text-text-muted mb-2">Max limit: ₹{booking.totalAmount}</p>
          <input
            type="number"
            min="0"
            max={booking.totalAmount}
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="e.g. 500"
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-yellow-500/30 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-yellow-400 font-mono"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary">Reason (optional)</label>
        <input
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation..."
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary hover:text-white"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {isPending || hasSubmitted ? 'Processing...' : (isPaid ? 'Cancel & Refund' : 'Confirm Cancel')}
        </button>
      </div>
    </Modal>
  );
}
