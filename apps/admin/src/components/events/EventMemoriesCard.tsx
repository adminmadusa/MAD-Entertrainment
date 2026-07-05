'use client';

import React, { useRef, useState, useCallback } from 'react';

import { adminApiClient } from '@/lib/api/client';
import { EventStatus, EventMemoryPublicationState, MAX_MEMORIES_GALLERY_LIMIT } from '@mad/shared';
import { FormField } from '@mad/ui';

import { inputCls, STATE_BADGE, STATE_LABELS } from './event-memories.constants';
import {
  type EventMemoriesCardProps,
  type MemoriesState,
  type MemoryGalleryItem,
  type UploadEntry,
} from './event-memories.types';
import { MemoriesGallery } from './MemoriesGallery';
import { MemoriesPublicationControls } from './MemoriesPublicationControls';

// Re-export types consumed by edit/page.tsx — preserves the existing import contract.
export type { EventMemoriesCardProps, MemoriesState, MemoryGalleryItem };

// ─── Main Component ───────────────────────────────────────────────────────────

export const EventMemoriesCard = React.memo(function EventMemoriesCard({
  eventStatus,
  eventSlug,
  value,
  onChange,
}: EventMemoriesCardProps) {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [uploadWarning, setUploadWarning] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { publicationState, heading, thankYouMessage, highlightsInput, gallery } = value;

  const update = useCallback(
    (patch: Partial<MemoriesState>) => onChange({ ...value, ...patch }),
    [value, onChange]
  );

  // ── Gallery management ────────────────────────────────────────────────────

  const remainingSlots = Math.max(0, MAX_MEMORIES_GALLERY_LIMIT - gallery.length);

  const uploadGalleryFile = async (file: File) => {
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;

    if (!file.type.startsWith('image/')) {
      setUploadWarning('Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadWarning('File too large. Max 5 MB allowed.');
      return;
    }
    if (uploads.some((u) => u.id === fingerprint && u.state === 'uploading')) {
      setUploadWarning(`"${file.name}" is already uploading.`);
      return;
    }

    setUploads((prev) => [
      ...prev,
      { id: fingerprint, name: file.name, progress: 0, state: 'uploading' },
    ]);
    setUploadWarning('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const sessionId = 'mem_' + crypto.randomUUID().slice(0, 8);

      const { data: res } = await adminApiClient.post<{
        data: { url: string; publicId: string; hash: string };
      }>(
        `/admin/uploads/image?folder=events&sessionId=${sessionId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === fingerprint ? { ...u, progress: pct } : u
                )
              );
            }
          },
        }
      );

      const newItem: MemoryGalleryItem = {
        url: res.data.url,
        publicId: res.data.publicId,
        order: gallery.length,
      };

      if (gallery.some((img) => img.publicId === newItem.publicId)) {
        setUploadWarning('Duplicate image detected. Not added.');
        adminApiClient
          .delete('/admin/uploads', { data: { publicId: newItem.publicId } })
          .catch(() => {});
        setUploads((prev) =>
          prev.map((u) =>
            u.id === fingerprint
              ? { ...u, state: 'error', error: 'Duplicate image' }
              : u
          )
        );
        return;
      }

      update({ gallery: [...gallery, newItem] });
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fingerprint ? { ...u, state: 'success', progress: 100 } : u
        )
      );
    } catch {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fingerprint
            ? { ...u, state: 'error', error: 'Upload failed' }
            : u
        )
      );
    }
  };

  const handleFileChange = (files: FileList) => {
    const count = Math.min(files.length, remainingSlots);
    for (let i = 0; i < count; i++) uploadGalleryFile(files[i]);
  };

  const removeGalleryItem = (idx: number) => {
    setUploadWarning('');
    const target = gallery[idx];

    const confirmDelete = window.confirm(
      'Are you sure you want to remove this image? This action will immediately delete the image from storage.'
    );
    if (!confirmDelete) return;

    if (target?.publicId) {
      adminApiClient
        .delete('/admin/uploads', { data: { publicId: target.publicId } })
        .catch((err) => console.warn('Failed to delete asset from Cloudinary:', err));
    }
    const next = gallery
      .filter((_, i) => i !== idx)
      .map((img, i) => ({ ...img, order: i }));
    update({ gallery: next });
  };

  const moveGalleryItem = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= gallery.length) return;
    const next = [...gallery];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ gallery: next.map((img, i) => ({ ...img, order: i })) });
  };

  const clearUploadEntry = (id: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  // ── Publication controls ──────────────────────────────────────────────────

  const handleStateChange = (next: EventMemoryPublicationState) => {
    if (
      next === EventMemoryPublicationState.PUBLISHED ||
      next === EventMemoryPublicationState.PREVIEW
    ) {
      const hasTextContent =
        heading.trim() !== '' ||
        thankYouMessage.trim() !== '' ||
        highlightsInput.trim() !== '';
      const hasImages = gallery.length > 0;

      if (!hasTextContent && !hasImages) {
        setUploadWarning(
          'Please configure at least one piece of content (heading, message, highlights, or gallery) before publishing or previewing.'
        );
        return;
      }
    }

    setUploadWarning('');
    update({ publicationState: next });
  };

  const openPreview = async () => {
    if (isPreviewLoading) return;
    setIsPreviewLoading(true);
    setUploadWarning('');

    const webOrigin = window.location.origin.replace(/:3001$/, ':3000');
    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.indexOf('events') + 1];

    try {
      const res = await adminApiClient.post<{ data: { token: string } }>(
        `/admin/events/${eventId}/preview-token`
      );
      const token = res.data?.data?.token;

      if (token) {
        window.open(
          `${webOrigin}/events/${eventSlug}?preview=${token}`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        throw new Error('No token returned');
      }
    } catch (err) {
      console.warn(
        'Failed to retrieve signed preview token. Falling back to query param preview.',
        err
      );
      window.open(
        `${webOrigin}/events/${eventSlug}?preview=memories`,
        '_blank',
        'noopener,noreferrer'
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
            onChange={(e) => update({ heading: e.target.value })}
            placeholder="e.g. An Unforgettable Night"
            maxLength={120}
            className={inputCls}
          />
        </FormField>

        <FormField label="Thank You Message" hint="optional — shown to attendees">
          <textarea
            id="memories-thank-you"
            value={thankYouMessage}
            onChange={(e) => update({ thankYouMessage: e.target.value })}
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
            onChange={(e) => update({ highlightsInput: e.target.value })}
            placeholder="e.g. 2000 attendees, 5 hours of music, Sold out"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Gallery sub-component */}
      <MemoriesGallery
        gallery={gallery}
        uploads={uploads}
        remainingSlots={remainingSlots}
        galleryInputRef={galleryInputRef}
        onFileChange={handleFileChange}
        onMove={moveGalleryItem}
        onRemove={removeGalleryItem}
        onClearUpload={clearUploadEntry}
      />

      {/* Publication controls sub-component */}
      <MemoriesPublicationControls
        publicationState={publicationState}
        isPreviewLoading={isPreviewLoading}
        onStateChange={handleStateChange}
        onOpenPreview={openPreview}
      />
    </div>
  );
});
