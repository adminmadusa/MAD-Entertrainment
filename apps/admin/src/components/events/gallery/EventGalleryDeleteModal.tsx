'use client';

import Image from 'next/image';
import React from 'react';

import type { EventGalleryItem } from '@mad/types';

export interface EventGalleryDeleteModalProps {
  item: EventGalleryItem;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EventGalleryDeleteModal = React.memo(function EventGalleryDeleteModal({
  item,
  isDeleting,
  onClose,
  onConfirm,
}: EventGalleryDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="glass max-w-md w-full rounded-2xl border border-border-subtle p-6 space-y-5 shadow-2xl bg-surface-elevated/90">
        <div className="flex items-center gap-3 text-red-400">
          <span className="text-2xl">⚠️</span>
          <h3 id="delete-dialog-title" className="text-lg font-bold text-white">
            Delete Gallery Photo?
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          Are you sure you want to permanently remove this photo from the event gallery? This action is <strong className="text-white">irreversible</strong> and will automatically purge the image asset from Cloudinary storage.
        </p>

        {/* Thumbnail Preview */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border-subtle bg-black/40">
          <Image
            src={item.thumbnail || item.url}
            alt="Photo to delete"
            fill
            className="object-contain"
          />
        </div>

        {item.isCover && (
          <div className="p-3 bg-accent-purple/10 border border-accent-purple/20 rounded-xl text-xs text-accent-purple-light flex items-center gap-2">
            <span>⭐</span>
            <span>This photo is currently the <strong>Cover Photo</strong>. If deleted, cover status will automatically transfer to the next available photo.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-lg shadow-red-900/30 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
