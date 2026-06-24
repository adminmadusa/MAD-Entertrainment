import React from 'react';
import { Modal } from '@mad/ui';

interface UserConfirmModalProps {
  isOpen: boolean;
  confirmType: 'suspend' | 'reactivate' | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function UserConfirmModal({
  isOpen,
  confirmType,
  isPending,
  onClose,
  onConfirm,
}: UserConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <h3 className="text-white font-bold text-lg">
            {confirmType === 'suspend' ? 'Suspend User?' : 'Reactivate User?'}
          </h3>
          <p className="text-text-muted text-xs mt-1">
            {confirmType === 'suspend'
              ? 'This user will no longer be able to log in, access their tickets, or complete new bookings.'
              : 'This user will regain immediate access to log in and review booking histories.'}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-xs font-medium text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-glow-sm disabled:opacity-50 transition-all ${
              confirmType === 'suspend'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-accent-purple hover:bg-accent-purple/80'
            }`}
          >
            {isPending ? 'Processing...' : confirmType === 'suspend' ? 'Suspend' : 'Reactivate'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
