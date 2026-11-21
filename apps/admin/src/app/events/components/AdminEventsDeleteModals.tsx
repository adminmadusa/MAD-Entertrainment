'use client';

import { extractApiError } from '@/lib/api/client';
import type { AdminEvent } from '@/lib/api/admin/event.service';
import { Button, FloatingActionBar, Modal } from '@mad/ui';

interface AdminEventsDeleteModalsProps {
  deleteTarget: AdminEvent | null;
  onCloseDeleteModal: () => void;
  onConfirmDelete: (id: string) => void;
  isDeleting: boolean;
  deleteError: unknown;
  isBulkDeleteModalOpen: boolean;
  onCloseBulkDeleteModal: () => void;
  onConfirmBulkDelete: () => void;
  isBulkDeleting: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onOpenBulkDeleteModal: () => void;
}

export function AdminEventsDeleteModals({
  deleteTarget,
  onCloseDeleteModal,
  onConfirmDelete,
  isDeleting,
  deleteError,
  isBulkDeleteModalOpen,
  onCloseBulkDeleteModal,
  onConfirmBulkDelete,
  isBulkDeleting,
  selectedCount,
  onClearSelection,
  onOpenBulkDeleteModal,
}: AdminEventsDeleteModalsProps) {
  return (
    <>
      {/* Delete Single Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={onCloseDeleteModal}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-event-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        {deleteTarget && (
          <div>
            <h2 id="delete-event-modal-title" className="text-white font-bold text-lg mb-2">
              Delete Event?
            </h2>
            <p className="text-text-secondary text-sm mb-1">
              <strong className="text-white">{deleteTarget.title}</strong> will be permanently deleted
              along with its Cloudinary images.
            </p>
            <p className="text-error text-xs mb-5">This action cannot be undone.</p>
            {deleteError && (
              <p className="text-red-400 text-xs mb-3">{extractApiError(deleteError).message}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCloseDeleteModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => onConfirmDelete(deleteTarget._id)}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirm Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={onCloseBulkDeleteModal}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="bulk-delete-event-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        <div>
          <h2 id="bulk-delete-event-modal-title" className="text-white font-bold text-lg mb-2">
            Delete {selectedCount} Events?
          </h2>
          <p className="text-text-secondary text-sm mb-1">
            You are about to permanently delete <strong className="text-white">{selectedCount}</strong>{' '}
            selected events.
          </p>
          <p className="text-error text-xs mb-5">This action cannot be undone.</p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseBulkDeleteModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onConfirmBulkDelete}
              disabled={isBulkDeleting}
              className="flex-1"
            >
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedCount}`}
            </Button>
          </div>
        </div>
      </Modal>

      <FloatingActionBar selectedCount={selectedCount} onClearSelection={onClearSelection}>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onOpenBulkDeleteModal}
          disabled={isBulkDeleting}
        >
          Delete Selected ({selectedCount})
        </Button>
      </FloatingActionBar>
    </>
  );
}
