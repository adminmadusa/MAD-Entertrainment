'use client';

import React, { useState } from 'react';

import { EventStatus } from '@mad/shared';
import { FormField, Modal } from '@mad/ui';

import { inputCls, STATE_BADGE, STATE_LABELS } from './event-memories.constants';
import {
  type EventMemoriesCardProps,
  type MemoriesState,
  type MemoryGalleryItem,
} from './event-memories.types';
import { MemoriesGallery } from './MemoriesGallery';
import { MemoriesPublicationControls } from './MemoriesPublicationControls';
import { useEventMemoriesHandlers } from './useEventMemoriesHandlers';

// Re-export types consumed by edit/page.tsx — preserves the existing import contract.
export type { EventMemoriesCardProps, MemoriesState, MemoryGalleryItem };

// ─── Component ───────────────────────────────────────────────────────────────

export const EventMemoriesCard = React.memo(function EventMemoriesCard({
  eventStatus,
  eventSlug,
  value,
  onChange,
}: EventMemoriesCardProps) {
  const { publicationState, heading, thankYouMessage, highlightsInput } = value;

  const {
    uploads,
    uploadWarning,
    isPreviewLoading,
    remainingSlots,
    galleryInputRef,
    handleFileChange,
    removeGalleryItem,
    moveGalleryItem,
    clearUploadEntry,
    handleStateChange,
    openPreview,
  } = useEventMemoriesHandlers({ value, onChange, eventSlug });

  const [deleteImageIdx, setDeleteImageIdx] = useState<number | null>(null);

  const confirmDeleteImage = () => {
    if (deleteImageIdx === null) return;
    removeGalleryItem(deleteImageIdx);
    setDeleteImageIdx(null);
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold">Event Memories</h2>
          <p className="text-text-muted text-xs mt-0.5 break-words">
            Post-event gallery and message visible to attendees on the event page.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 uppercase tracking-wider ${STATE_BADGE[publicationState]}`}
        >
          {STATE_LABELS[publicationState]}
        </span>
      </div>

      {/* Visibility warning for non-COMPLETED events */}
      {eventStatus !== EventStatus.COMPLETED && (
        <div className="flex gap-2.5 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span className="font-bold">Preparation Mode:</span> Memories can be set
            up now, but they will only be displayed on the public event page once the
            event status is updated to <span className="font-bold">Completed</span> in
            the Basic Information card.
          </div>
        </div>
      )}

      {/* Warning banner */}
      {uploadWarning && (
        <div
          role="alert"
          aria-live="polite"
          className="px-4 py-2.5 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400"
        >
          {uploadWarning}
        </div>
      )}

      {/* Content fields */}
      <div className="space-y-4">
        <FormField label="Section Heading" hint="optional">
          <input
            id="memories-heading"
            value={heading}
            onChange={(e) => onChange({ ...value, heading: e.target.value })}
            placeholder="e.g. An Unforgettable Night"
            maxLength={120}
            className={inputCls}
          />
        </FormField>

        <FormField label="Thank You Message" hint="optional — shown to attendees">
          <textarea
            id="memories-thank-you"
            value={thankYouMessage}
            onChange={(e) => onChange({ ...value, thankYouMessage: e.target.value })}
            placeholder="e.g. Thank you for being part of this incredible evening…"
            rows={3}
            maxLength={500}
            className={`${inputCls} resize-none`}
          />
          <p className="text-[11px] text-text-muted text-right">
            {thankYouMessage.length} / 500
          </p>
        </FormField>

        <FormField label="Highlights" hint="comma separated, optional">
          <input
            id="memories-highlights"
            value={highlightsInput}
            onChange={(e) => onChange({ ...value, highlightsInput: e.target.value })}
            placeholder="e.g. 2000 attendees, 5 hours of music, Sold out"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Gallery sub-component */}
      <MemoriesGallery
        gallery={value.gallery}
        uploads={uploads}
        remainingSlots={remainingSlots}
        galleryInputRef={galleryInputRef}
        onFileChange={handleFileChange}
        onMove={moveGalleryItem}
        onRemove={setDeleteImageIdx}
        onClearUpload={clearUploadEntry}
      />

      {/* Publication controls sub-component */}
      <MemoriesPublicationControls
        publicationState={publicationState}
        isPreviewLoading={isPreviewLoading}
        onStateChange={handleStateChange}
        onOpenPreview={openPreview}
      />

      <Modal
        isOpen={deleteImageIdx !== null}
        onClose={() => setDeleteImageIdx(null)}
        size="sm"
        showCloseButton={false}
        closeOnBackdropClick={true}
        ariaLabelledBy="delete-image-confirm-modal-title"
        className="glass-strong border border-border-subtle p-6 max-w-sm"
      >
        <h2 id="delete-image-confirm-modal-title" className="text-white font-bold text-lg mb-2">Remove Image?</h2>
        <p className="text-text-secondary text-sm mb-5">
          Are you sure you want to remove this image? This action will immediately delete the image from storage.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteImageIdx(null)}
            className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteImage}
            className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors"
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
});
