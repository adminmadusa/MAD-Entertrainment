'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicDeleteAccount } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import { Button, Modal } from '@mad/ui';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function DeleteAccountModal({ isOpen, onClose, userEmail }: DeleteAccountModalProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const normalizedInput = confirmationInput.trim().toLowerCase();
  const isMatch = normalizedInput === 'delete' || normalizedInput === userEmail.trim().toLowerCase();

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput('');
    setErrorMsg('');
    onClose();
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setErrorMsg('');

    try {
      await publicDeleteAccount(confirmationInput.trim());
      await logout();
      onClose();
      router.push('/');
    } catch (err: unknown) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showCloseButton={!isDeleting}
      closeOnBackdropClick={!isDeleting}
      ariaLabelledBy="delete-account-title"
      ariaDescribedBy="delete-account-description"
    >
      <form onSubmit={handleDelete} className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-400">
            <span>⚠️</span>
            <span>Permanent & Irreversible</span>
          </div>
          <h2 id="delete-account-title" className="text-xl sm:text-2xl font-black text-white">
            Delete Account
          </h2>
          <p id="delete-account-description" className="text-text-secondary text-xs sm:text-sm leading-relaxed">
            Please read the following consequences carefully before permanently deleting your account.
          </p>
        </div>

        {/* Warning Callout & Itemized Consequences */}
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-3 text-xs sm:text-sm text-text-secondary">
          <p className="font-semibold text-red-300">
            By proceeding, you understand and agree to the following:
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs leading-relaxed text-text-secondary">
            <li>
              <strong className="text-white">Immediate Signout:</strong> You will be logged out on all devices and your profile will be permanently anonymized.
            </li>
            <li>
              <strong className="text-white">Active Event Tickets:</strong> If you hold upcoming tickets, you must use your previously downloaded PDF passes or confirmation emails to enter at the gate.
            </li>
            <li>
              <strong className="text-white">Saved Preferences & Rewards:</strong> All order history, saved addresses, and notification preferences will be erased.
            </li>
            <li>
              <strong className="text-white">Statutory Financial Retention:</strong> In compliance with US tax laws, past transaction records are retained in an anonymized archive for 7 years.
            </li>
          </ul>
        </div>

        {/* Confirmation Input Field */}
        <div className="space-y-2">
          <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-text-primary">
            To confirm, type <span className="text-red-400 font-bold select-all">&quot;DELETE&quot;</span> or your email <span className="text-white font-mono font-bold select-all">({userEmail})</span> below:
          </label>
          <input
            id="confirm-delete-input"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder='Type "DELETE" or your email'
            disabled={isDeleting}
            autoComplete="off"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs font-semibold text-red-400 p-3 bg-red-500/10 border border-red-500/20 rounded-xl" role="alert">
            ⚠️ {errorMsg}
          </p>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={handleClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isMatch || isDeleting}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 min-h-[44px] shadow-lg shadow-red-600/20"
          >
            {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
