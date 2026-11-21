'use client';

import { extractApiError } from '@/lib/api/client';
import type { PopupCampaign } from '@mad/types';
import { Modal, Button } from '@mad/ui';

interface AdminPopupsDeleteModalProps {
  target: PopupCampaign | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
  error: unknown;
}

export function AdminPopupsDeleteModal({
  target,
  onClose,
  onConfirm,
  isPending,
  error,
}: AdminPopupsDeleteModalProps) {
  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="delete-popup-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm"
    >
      {target && (
        <div>
          <h2 id="delete-popup-modal-title" className="text-white font-bold text-lg mb-2">Delete Popup?</h2>
          <p className="text-text-secondary text-sm mb-1">
            <strong className="text-white">{target.name}</strong> will be permanently deleted.
          </p>
          <p className="text-error text-xs mb-5">This action cannot be undone.</p>
          {error != null && (
            <p className="text-red-400 text-xs mb-3">{extractApiError(error).message}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => onConfirm(target._id)}
              disabled={isPending}
              isLoading={isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
