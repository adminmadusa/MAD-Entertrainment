'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { extractApiError } from '@/lib/api/client';
import { AdminBooking } from '@/lib/api/admin/booking.service';

export interface CorrectEmailModalProps {
  booking: AdminBooking;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newEmail: string, reason: string) => Promise<void>;
  isPending: boolean;
}

export default function CorrectEmailModal({
  booking,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: CorrectEmailModalProps) {
  const customer = booking.userId ?? booking.guestInfo;
  const currentEmail = customer?.email ?? '';

  // Internalized state variables
  const [editEmailValue, setEditEmailValue] = useState(currentEmail === '—' ? '' : currentEmail);
  const [editReasonValue, setEditReasonValue] = useState('');
  const [editEmailError, setEditEmailError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEmailError('');

    // Basic client-side email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmailValue.trim())) {
      setEditEmailError('Please enter a valid email address.');
      return;
    }

    // Reason length checks
    const reason = editReasonValue.trim();
    if (reason.length < 5 || reason.length > 500) {
      setEditEmailError('Reason must be between 5 and 500 characters.');
      return;
    }

    try {
      await onSubmit(editEmailValue.trim(), reason);
    } catch (err: any) {
      setEditEmailError(extractApiError(err).message || 'Failed to correct email');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
      >
        <div>
          <h3 className="text-white font-bold text-lg">Correct Booking Email</h3>
          <p className="text-text-muted text-xs">Update recipient email for guest booking</p>
        </div>

        {editEmailError && (
          <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
            {editEmailError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Current Email</label>
            <div className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-text-muted font-mono select-all">
              {currentEmail || '—'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">New Email Address</label>
            <input
              type="email"
              value={editEmailValue}
              onChange={(e) => setEditEmailValue(e.target.value)}
              placeholder="e.g. customer.fixed@gmail.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-xs font-medium block">Reason for Correction</label>
            <textarea
              value={editReasonValue}
              onChange={(e) => setEditReasonValue(e.target.value)}
              placeholder="e.g. Customer typo in domain extension (gmial.com to gmail.com)"
              required
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors resize-none"
            />
            <p className="text-[10px] text-text-muted">
              Administrative audit trails require 5 to 500 characters.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
