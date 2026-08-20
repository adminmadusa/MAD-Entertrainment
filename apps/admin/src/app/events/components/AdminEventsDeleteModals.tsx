'use client';

import { Modal, FloatingActionBar } from '@mad/ui';
import { extractApiError } from '@/lib/api/client';
import type { AdminEvent } from '@/lib/api/admin/event.service';

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
              <button
                onClick={onCloseDeleteModal}
                className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmDelete(deleteTarget._id)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
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
            <button
              onClick={onCloseBulkDeleteModal}
              className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmBulkDelete}
              disabled={isBulkDeleting}
              className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedCount}`}
            </button>
          </div>
        </div>
      </Modal>

      <FloatingActionBar selectedCount={selectedCount} onClearSelection={onClearSelection}>
        <button
          onClick={onOpenBulkDeleteModal}
          disabled={isBulkDeleting}
          className="px-4 py-2 text-sm font-semibold bg-error/80 hover:bg-error text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Delete Selected ({selectedCount})
        </button>
      </FloatingActionBar>
    </>
  );
}
