'use client';

import { useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/api/client';

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  hash?: string;
  alt?: string;
}

export type UploadProgress = {
  id: string;
  name: string;
  progress: number;
  state: 'uploading' | 'success' | 'error';
  error?: string;
};

interface UseUnifiedMediaUploadProps {
  bannerImage: CloudinaryAsset | null;
  posterImage: CloudinaryAsset | null;
  galleryImages: CloudinaryAsset[];
  onChange?: (
    banner: CloudinaryAsset | null,
    poster: CloudinaryAsset | null,
    gallery: CloudinaryAsset[]
  ) => void;
  triggerOnly?: boolean;
  onUploadsSuccess?: (assets: CloudinaryAsset[]) => void;
  allImages: Array<{ asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }>;
}

export function useUnifiedMediaUpload({
  bannerImage,
  posterImage,
  galleryImages,
  onChange,
  triggerOnly,
  onUploadsSuccess,
  allImages,
}: UseUnifiedMediaUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [warningMessage, setWarningMessage] = useState('');

  const isDuplicateFile = useCallback(
    (file: File): boolean => {
      const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
      return uploads.some((up) => up.id === fingerprint && up.state === 'uploading');
    },
    [uploads]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;

      if (isDuplicateFile(file)) {
        setWarningMessage(`File "${file.name}" is already being uploaded.`);
        return;
      }

      if (!file.type.startsWith('image/')) {
        setWarningMessage('Only image files are allowed.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setWarningMessage('File is too large. Max 5MB allowed.');
        return;
      }

      const newUpload: UploadProgress = {
        id: fingerprint,
        name: file.name,
        progress: 0,
        state: 'uploading',
      };
      setUploads((prev) => [...prev, newUpload]);
      setWarningMessage('');

      try {
        const formData = new FormData();
        formData.append('image', file);
        const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);

        const { data: uploadRes } = await adminApiClient.post<{
          data: { url: string; publicId: string; hash: string };
        }>(`/admin/uploads/image?folder=events&sessionId=${sessionId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setUploads((prev) =>
                prev.map((u) => (u.id === fingerprint ? { ...u, progress: pct } : u))
              );
            }
          },
        });

        const newAsset: CloudinaryAsset = {
          url: uploadRes.data.url,
          publicId: uploadRes.data.publicId,
          hash: uploadRes.data.hash,
        };

        const isDuplicateAsset = allImages.some(
          (item) =>
            item.asset.publicId === newAsset.publicId ||
            (item.asset.hash && item.asset.hash === newAsset.hash)
        );

        if (isDuplicateAsset) {
          setWarningMessage('Duplicate image detected. File will not be added.');
          setUploads((prev) =>
            prev.map((u) =>
              u.id === fingerprint
                ? { ...u, state: 'error', error: 'Duplicate image detected' }
                : u
            )
          );
          adminApiClient
            .delete('/admin/uploads', { data: { publicId: newAsset.publicId } })
            .catch(() => {});
          return;
        }

        if (triggerOnly) {
          onUploadsSuccess?.([newAsset]);
          setUploads((prev) =>
            prev.map((u) => (u.id === fingerprint ? { ...u, state: 'success', progress: 100 } : u))
          );
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== fingerprint));
          }, 1500);
        } else {
          let newBanner = bannerImage;
          let newPoster = posterImage;
          const newGallery = [...galleryImages];

          if (!newBanner) {
            newBanner = newAsset;
          } else if (!newPoster) {
            newPoster = newAsset;
          } else {
            newGallery.push(newAsset);
          }

          onChange?.(newBanner, newPoster, newGallery);
          setUploads((prev) => prev.filter((u) => u.id !== fingerprint));
        }
      } catch (err: any) {
        console.error('[UnifiedMediaUpload] Upload failed:', err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Upload failed';
        setWarningMessage(typeof msg === 'string' ? msg : 'Upload failed');
        setUploads((prev) =>
          prev.map((u) =>
            u.id === fingerprint
              ? { ...u, state: 'error', error: typeof msg === 'string' ? msg : 'Upload failed' }
              : u
          )
        );
      }
    },
    [
      allImages,
      bannerImage,
      posterImage,
      galleryImages,
      isDuplicateFile,
      onChange,
      onUploadsSuccess,
      triggerOnly,
    ]
  );

  const clearUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return {
    uploads,
    warningMessage,
    setWarningMessage,
    uploadFile,
    clearUpload,
  };
}
