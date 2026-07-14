'use client';

import { useCallback, useRef, useState } from 'react';

import { adminApiClient } from '@/lib/api/client';
import { EventMemoryPublicationState, MAX_MEMORIES_GALLERY_LIMIT } from '@mad/shared';

import { type MemoriesState, type MemoryGalleryItem, type UploadEntry } from './event-memories.types';

// ─── Interface ───────────────────────────────────────────────────────────────

interface UseEventMemoriesHandlersParams {
  value: MemoriesState;
  onChange: (next: MemoriesState) => void;
  eventSlug: string;
}

export interface UseEventMemoriesHandlersReturn {
  uploads: UploadEntry[];
  uploadWarning: string;
  isPreviewLoading: boolean;
  remainingSlots: number;
  galleryInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (files: FileList) => void;
  removeGalleryItem: (idx: number) => void;
  moveGalleryItem: (idx: number, dir: 'up' | 'down') => void;
  clearUploadEntry: (id: string) => void;
  handleStateChange: (next: EventMemoryPublicationState) => void;
  openPreview: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEventMemoriesHandlers({
  value,
  onChange,
  eventSlug,
}: UseEventMemoriesHandlersParams): UseEventMemoriesHandlersReturn {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [uploadWarning, setUploadWarning] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { heading, thankYouMessage, highlightsInput, gallery } = value;

  const update = useCallback(
    (patch: Partial<MemoriesState>) => onChange({ ...value, ...patch }),
    [value, onChange]
  );

  const remainingSlots = Math.max(0, MAX_MEMORIES_GALLERY_LIMIT - gallery.length);

  // ── Gallery management ────────────────────────────────────────────────────

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

  return {
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
  };
}
