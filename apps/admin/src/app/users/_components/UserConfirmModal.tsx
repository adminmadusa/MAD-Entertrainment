import React from 'react';

import { Modal, Button } from '@mad/ui';

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
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant={confirmType === 'suspend' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isPending}
            isLoading={isPending}
            className="flex-1"
          >
            {confirmType === 'suspend' ? 'Suspend' : 'Reactivate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
