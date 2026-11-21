'use client';

import React from 'react';
import { extractApiError } from '@/lib/api/client';
import type { Coupon } from '@mad/types';
import { Modal, Button } from '@mad/ui';

export interface DeleteCouponModalProps {
  coupon: Coupon | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
  error: unknown;
}

export function DeleteCouponModal({
  coupon,
  onClose,
  onConfirm,
  isPending,
  error,
}: DeleteCouponModalProps) {
  if (!coupon) return null;

  return (
    <Modal
      isOpen={!!coupon}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={true}
      ariaLabelledBy="delete-coupon-modal-title"
      className="glass-strong border border-border-subtle p-6 max-w-sm"
    >
      <div>
        <h2 id="delete-coupon-modal-title" className="text-white font-bold text-lg mb-2">Delete Coupon?</h2>
        <p className="text-text-secondary text-sm mb-1">
          Coupon code <strong className="text-white font-mono">{coupon.code}</strong> will be permanently deleted.
        </p>
        <p className="text-error text-xs mb-5">This action cannot be undone.</p>
        {!!error && (
          <p className="text-red-400 text-xs mb-3">{extractApiError(error).message}</p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => onConfirm(coupon._id)}
            disabled={isPending}
            isLoading={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
