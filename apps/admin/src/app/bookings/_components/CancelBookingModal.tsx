'use client';

import { Modal } from '@mad/ui';
import { useState } from 'react';

import { AdminBooking } from '@/lib/api/admin/booking.service';

export interface CancelBookingModalProps {
  booking: AdminBooking;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isPending: boolean;
}

export default function CancelBookingModal({
  booking,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: CancelBookingModalProps) {
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen) return null;

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
      <h3 id="cancel-modal-title" className="text-white font-bold">Cancel Booking</h3>
        <p className="text-text-secondary text-sm">
          Booking <span className="text-accent-purple font-mono">{booking.bookingId}</span> will be cancelled.
        </p>
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
            className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(cancelReason)}
            disabled={isPending}
            className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium disabled:opacity-60"
          >
            {isPending ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
    </Modal>
  );
}
