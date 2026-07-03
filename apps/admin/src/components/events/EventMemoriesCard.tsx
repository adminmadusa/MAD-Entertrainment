'use client';

import React, { useRef, useState, useCallback } from 'react';
import { FormField } from '@mad/ui';
import {
  EventStatus,
  EventMemoryPublicationState,
  MAX_MEMORIES_GALLERY_LIMIT,
} from '@mad/shared';

import { adminApiClient } from '@/lib/api/client';
import { type CloudinaryImage } from '@/lib/api/admin/event.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryGalleryItem extends CloudinaryImage {
  order: number;
}

export interface MemoriesState {
  publicationState: EventMemoryPublicationState;
  heading: string;
  thankYouMessage: string;
  /** Comma-separated string; split to string[] on submit */
  highlightsInput: string;
  gallery: MemoryGalleryItem[];
}

export interface EventMemoriesCardProps {
  eventStatus: EventStatus;
  eventSlug: string;
  value: MemoriesState;
  onChange: (next: MemoriesState) => void;
}

// ─── Shared Design Tokens ────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple/30 transition-colors';

// ─── Publication state metadata ──────────────────────────────────────────────

const STATE_LABELS: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'Draft',
  [EventMemoryPublicationState.PREVIEW]: 'Preview',
  [EventMemoryPublicationState.PUBLISHED]: 'Published',
  [EventMemoryPublicationState.HIDDEN]: 'Hidden',
};

const STATE_BADGE: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'bg-white/10 text-text-muted border border-white/5',
  [EventMemoryPublicationState.PREVIEW]: 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
  [EventMemoryPublicationState.PUBLISHED]: 'bg-green-500/20 text-green-400 border border-green-500/30',
  [EventMemoryPublicationState.HIDDEN]: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
};

const STATE_ACTIVE: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]: 'bg-white/15 text-white ring-2 ring-white/30',
  [EventMemoryPublicationState.PREVIEW]: 'bg-accent-purple/35 text-accent-purple ring-2 ring-accent-purple/50',
  [EventMemoryPublicationState.PUBLISHED]: 'bg-green-500/35 text-green-300 ring-2 ring-green-500/50',
  [EventMemoryPublicationState.HIDDEN]: 'bg-yellow-500/25 text-yellow-300 ring-2 ring-yellow-500/40',
};

const STATE_HINT: Record<EventMemoryPublicationState, string> = {
  [EventMemoryPublicationState.DRAFT]:
    'Saved as draft. Not visible to the public.',
  [EventMemoryPublicationState.PREVIEW]:
    'Accessible via preview link only. Not indexed publicly.',
  [EventMemoryPublicationState.PUBLISHED]:
    'Live and visible to all visitors on the event page.',
  [EventMemoryPublicationState.HIDDEN]:
    'Hidden from public view. Original publish date is preserved.',
};

// ─── Upload progress type ────────────────────────────────────────────────────

type UploadEntry = {
  id: string;
  name: string;
  progress: number;
  state: 'uploading' | 'success' | 'error';
  error?: string;
};


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

  const { publicationState, heading, thankYouMessage, highlightsInput, gallery } =
    value;

  const update = useCallback(
    (patch: Partial<MemoriesState>) => onChange({ ...value, ...patch }),
    [value, onChange]
  );

  // ── Gallery management ───────────────────────────────────────────────────

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

  const removeGalleryItem = (idx: number) => {
    setUploadWarning('');
    const target = gallery[idx];

    // Accidental deletion protection: Request explicit confirmation before deleting
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

  const handleKeyboardReorder = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    dir: 'up' | 'down'
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      moveGalleryItem(idx, dir);
    }
  };

  const clearUploadEntry = (id: string) =>
    setUploads((prev) => prev.filter((u) => u.id !== id));

  // ── Publication controls ─────────────────────────────────────────────────

  const handleStateChange = (next: EventMemoryPublicationState) => {
    // Client Validation: Allow publishing with 0 images if thank-you message, heading, or highlights are set.
    // If absolutely everything is empty, block transition to PREVIEW/PUBLISHED.
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
    // Find the event ID from URL pathname (/events/[id]/edit)
    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.indexOf('events') + 1];

    try {
      // 1. Request short-lived signed preview token from backend
      const res = await adminApiClient.post<{ data: { token: string } }>(
        `/admin/events/${eventId}/preview-token`
      );
      const token = res.data?.data?.token;

      if (token) {
        // 2. Open preview with JWS token
        window.open(
          `${webOrigin}/events/${eventSlug}?preview=${token}`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        throw new Error('No token returned');
      }
    } catch (err) {
      // 3. Graceful fallback for Phase 3 during local testing
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

  // ── Render ───────────────────────────────────────────────────────────────

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

      {/* Gallery section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            Memory Gallery{' '}
            <span className="text-text-muted font-normal text-xs">
              ({gallery.length} / {MAX_MEMORIES_GALLERY_LIMIT})
            </span>
          </span>
          <button
            type="button"
            onClick={() => remainingSlots > 0 && galleryInputRef.current?.click()}
            disabled={remainingSlots === 0}
            className="min-w-[44px] min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 focus-visible:ring-2 focus-visible:ring-accent-purple focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + Add Photos
          </button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files) {
              const count = Math.min(files.length, remainingSlots);
              for (let i = 0; i < count; i++) uploadGalleryFile(files[i]);
            }
            e.target.value = '';
          }}
        />

        {gallery.length === 0 ? (
          <div
            onClick={() => remainingSlots > 0 && galleryInputRef.current?.click()}
            className="aspect-[3/1] rounded-xl border-2 border-dashed border-border-subtle hover:border-accent-purple/40 cursor-pointer flex flex-col items-center justify-center gap-2 bg-white/2 hover:bg-white/3 transition-all"
          >
            <span className="text-xs text-text-secondary font-medium">
              Click to add memory photos
            </span>
            <span className="text-[10px] text-text-muted">
              Up to {MAX_MEMORIES_GALLERY_LIMIT} images · max 5 MB each
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {gallery.map((img, idx) => (
              <div
                key={img.publicId}
                className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle bg-black/40 group focus-within:ring-2 focus-within:ring-accent-purple"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Memory ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col items-center justify-between p-2">
                  <div className="flex w-full justify-between items-center">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveGalleryItem(idx, 'up')}
                      onKeyDown={(e) => handleKeyboardReorder(e, idx, 'up')}
                      className="w-9 h-9 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white text-xs font-black disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                      aria-label="Move memory image left"
                      title="Move Left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={idx === gallery.length - 1}
                      onClick={() => moveGalleryItem(idx, 'down')}
                      onKeyDown={(e) => handleKeyboardReorder(e, idx, 'down')}
                      className="w-9 h-9 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-lg text-white text-xs font-black disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                      aria-label="Move memory image right"
                      title="Move Right"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(idx)}
                    className="min-w-[44px] min-h-[32px] px-3.5 py-1.5 bg-error/70 hover:bg-error backdrop-blur text-white text-[10px] font-bold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label="Remove memory image"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active upload progress */}
        {uploads.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/5">
            <span className="text-xs font-bold text-white block">Active Uploads</span>
            <div className="space-y-2">
              {uploads.map((up) => (
                <div
                  key={up.id}
                  className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate font-medium">{up.name}</p>
                    {up.state === 'uploading' && (
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-accent-purple transition-all"
                          style={{ width: `${up.progress}%` }}
                        />
                      </div>
                    )}
                    {up.state === 'error' && (
                      <p className="text-error mt-0.5 font-semibold">
                        {up.error ?? 'Upload failed'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">
                      {up.state === 'uploading'
                        ? `${up.progress}%`
                        : up.state.toUpperCase()}
                    </span>
                    {up.state !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => clearUploadEntry(up.id)}
                        className="text-text-muted hover:text-white min-w-[32px] min-h-[32px] flex items-center justify-center"
                        aria-label="Clear upload progress item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Publication state controls */}
      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
          Publication State
        </p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              EventMemoryPublicationState.DRAFT,
              EventMemoryPublicationState.PREVIEW,
              EventMemoryPublicationState.PUBLISHED,
              EventMemoryPublicationState.HIDDEN,
            ] as const
          ).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => handleStateChange(state)}
              className={[
                'min-h-[44px] min-w-[70px] px-4 py-2 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple',
                publicationState === state
                  ? STATE_ACTIVE[state]
                  : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-secondary',
              ].join(' ')}
            >
              {STATE_LABELS[state]}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-text-muted">{STATE_HINT[publicationState]}</p>

        {/* Preview link — visible when in PREVIEW or PUBLISHED state */}
        {(publicationState === EventMemoryPublicationState.PREVIEW ||
          publicationState === EventMemoryPublicationState.PUBLISHED) && (
          <button
            type="button"
            disabled={isPreviewLoading}
            onClick={openPreview}
            className="min-h-[44px] flex items-center gap-1.5 text-xs text-accent-purple hover:text-accent-purple/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple disabled:opacity-50 transition-colors"
          >
            {isPreviewLoading ? (
              <span className="animate-spin inline-block w-3 h-3 border-t-2 border-accent-purple rounded-full" />
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            )}
            Open event page preview
          </button>
        )}
      </div>
    </div>
  );
});
