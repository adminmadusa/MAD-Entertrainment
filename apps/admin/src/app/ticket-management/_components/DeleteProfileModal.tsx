import React from 'react';

import { extractApiError } from '@/lib/api/client';
import type { TicketProfile } from '@mad/types';
import { Modal, Button } from '@mad/ui';

interface DeleteProfileModalProps {
  deleteTarget: TicketProfile | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
  isPending: boolean;
  error: unknown;
}

export function DeleteProfileModal({
  deleteTarget,
  onClose,
  onConfirmDelete,
  isPending,
  error,
}: DeleteProfileModalProps) {
  return (
    <Modal
      isOpen={!!deleteTarget}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="delete-profile-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm"
    >
      {deleteTarget && (
        <div>
          <h2 id="delete-profile-modal-title" className="text-white font-bold text-lg mb-2">Delete Ticket Profile?</h2>
          <p className="text-text-secondary text-sm mb-1">
            Profile <strong className="text-white">{deleteTarget.name}</strong> will be permanently deleted.
          </p>
          <p className="text-error text-xs mb-5 font-semibold">This action cannot be undone.</p>
          {error && (
            <p className="text-red-400 text-xs mb-3">{extractApiError(error).message}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => onConfirmDelete(deleteTarget._id)}
              disabled={isPending}
              isLoading={isPending}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
