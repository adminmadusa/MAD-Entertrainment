'use client';

import React from 'react';

import type { AdminCategory } from '@/lib/api/admin/category.service';
import { Modal, Button } from '@mad/ui';

interface DeleteCategoryModalProps {
  target: AdminCategory | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteCategoryModal({
  target,
  onClose,
  onConfirm,
  isPending,
}: DeleteCategoryModalProps) {
  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="delete-category-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm"
    >
      <h2 id="delete-category-modal-title" className="text-white font-bold text-lg mb-2">
        Delete Category?
      </h2>
      <p className="text-text-secondary text-sm mb-5">
        Are you sure you want to delete <span className="text-white font-semibold">{target?.name}</span>? Past events and bookings using it will remain preserved.
      </p>
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
          onClick={onConfirm}
          disabled={isPending}
          isLoading={isPending}
          className="flex-1"
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}
