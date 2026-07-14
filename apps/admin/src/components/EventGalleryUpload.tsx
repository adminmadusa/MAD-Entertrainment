'use client';

import { useState, useRef } from 'react';

import { adminApiClient } from '@/lib/api/client';

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  hash?: string;
  alt?: string;
}

interface EventGalleryUploadProps {
  bannerImage: CloudinaryAsset | null;
  posterImage: CloudinaryAsset | null;
  galleryImages: CloudinaryAsset[];
  onChange: (
    banner: CloudinaryAsset | null,
    poster: CloudinaryAsset | null,
    gallery: CloudinaryAsset[]
  ) => void;
  maxTotalImages?: number;
}

type UploadProgress = { id: string; name: string; progress: number; state: 'uploading' | 'success' | 'error'; error?: string };

export function EventGalleryUpload({
  bannerImage,
  posterImage,
  galleryImages,
  onChange,
  maxTotalImages = 15,
}: EventGalleryUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [warningMessage, setWarningMessage] = useState('');
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Compute total occupied slots
  const totalCount = (bannerImage ? 1 : 0) + (posterImage ? 1 : 0) + galleryImages.length;
  const remainingSlots = Math.max(0, maxTotalImages - totalCount);

  // Simple client-side file fingerprint check
  const isDuplicateFile = (file: File): boolean => {
    // Generate fingerprint: name_size_lastModified
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
    // We check against files currently being uploaded
    return uploads.some((up) => up.id === fingerprint);
  };

  const uploadFile = async (
    file: File,
    type: 'banner' | 'poster' | 'gallery'
  ) => {
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;

    if (isDuplicateFile(file)) {
      setWarningMessage(`File "${file.name}" is already being uploaded.`);
      return;
    }

    // Check sizes/types
    if (!file.type.startsWith('image/')) {
      setWarningMessage('Only image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setWarningMessage('File is too large. Max 5MB allowed.');
      return;
    }

    // Set initial progress state
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

      // Generate a temporary formSessionId for isolation
      const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);

      const { data: uploadRes } = await adminApiClient.post<{ data: { url: string; publicId: string; hash: string } }>(
        `/admin/uploads/image?folder=events&sessionId=${sessionId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setUploads((prev) =>
                prev.map((u) => (u.id === fingerprint ? { ...u, progress: pct } : u))
              );
            }
          },
        }
      );

      const newAsset: CloudinaryAsset = {
        url: uploadRes.data.url,
        publicId: uploadRes.data.publicId,
        hash: uploadRes.data.hash,
      };

      // Check duplicates in final payload state (both publicId and hash)
      const allExistingAssets = [
        ...(bannerImage ? [bannerImage] : []),
        ...(posterImage ? [posterImage] : []),
        ...galleryImages,
      ];

      const isDuplicateAsset = allExistingAssets.some(
        (asset) => asset.publicId === newAsset.publicId || (asset.hash && asset.hash === newAsset.hash)
      );

      if (isDuplicateAsset) {
        setWarningMessage('Duplicate image detected. File will not be added.');
        setUploads((prev) =>
          prev.map((u) =>
            u.id === fingerprint ? { ...u, state: 'error', error: 'Duplicate image detected' } : u
          )
        );
        // Fire-and-forget delete from Cloudinary since it's duplicate
        adminApiClient.delete('/admin/uploads', { data: { publicId: newAsset.publicId } }).catch(() => {});
        return;
      }

      // Add to appropriate state
      if (type === 'banner') {
        onChange(newAsset, posterImage, galleryImages);
      } else if (type === 'poster') {
        onChange(bannerImage, newAsset, galleryImages);
      } else {
        onChange(bannerImage, posterImage, [...galleryImages, newAsset]);
      }

      setUploads((prev) =>
        prev.map((u) => (u.id === fingerprint ? { ...u, state: 'success', progress: 100 } : u))
      );
    } catch (err) {
      console.error('[EventGalleryUpload] Upload failed:', err);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === fingerprint ? { ...u, state: 'error', error: 'Upload failed' } : u
        )
      );
    }
  };

  const handleRemove = (type: 'banner' | 'poster' | number) => {
    setWarningMessage('');
    if (type === 'banner') {
      if (bannerImage?.publicId) {
        adminApiClient.delete('/admin/uploads', { data: { publicId: bannerImage.publicId } }).catch(() => {});
      }
      onChange(null, posterImage, galleryImages);
    } else if (type === 'poster') {
      if (posterImage?.publicId) {
        adminApiClient.delete('/admin/uploads', { data: { publicId: posterImage.publicId } }).catch(() => {});
      }
      onChange(bannerImage, null, galleryImages);
    } else {
      const idxToRemove = type;
      const targetAsset = galleryImages[idxToRemove];
      if (targetAsset?.publicId) {
        adminApiClient.delete('/admin/uploads', { data: { publicId: targetAsset.publicId } }).catch(() => {});
      }
      onChange(
        bannerImage,
        posterImage,
        galleryImages.filter((_, idx) => idx !== idxToRemove)
      );
    }
  };

  const moveGalleryItem = (index: number, direction: 'up' | 'down') => {
    setWarningMessage('');
    const newGallery = [...galleryImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newGallery.length) return;

    // Swap elements
    const temp = newGallery[index];
    newGallery[index] = newGallery[targetIndex];
    newGallery[targetIndex] = temp;

    onChange(bannerImage, posterImage, newGallery);
  };

  const clearUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="space-y-6">
      {warningMessage && (
        <div aria-live="polite" className="px-4 py-2 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400">
          {warningMessage}
        </div>
      )}

      {/* Upload slots indicator */}
      <div className="flex justify-between items-center text-xs text-text-muted">
        <span>Image Slots: {totalCount} / {maxTotalImages} occupied</span>
        <span>{remainingSlots} slots remaining</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Banner Image Slot (Required) */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
          <span className="text-sm font-bold text-white block">Banner Image *</span>
          {bannerImage ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle group bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerImage.url} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold rounded-lg"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('banner')}
                  className="px-3 py-1.5 bg-error/70 hover:bg-error backdrop-blur text-white text-xs font-semibold rounded-lg"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => remainingSlots > 0 && bannerInputRef.current?.click()}
              className={`aspect-video rounded-xl border-2 border-dashed border-border-subtle hover:border-accent-purple/50 cursor-pointer flex flex-col items-center justify-center text-center p-4 bg-white/2 hover:bg-white/3 ${
                remainingSlots === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span className="text-xs text-text-secondary font-medium">Upload Banner (Hero)</span>
              <span className="text-[10px] text-text-muted mt-1">Aspect Ratio 16:9</span>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, 'banner');
              e.target.value = '';
            }}
          />
        </div>

        {/* Poster Image Slot (Optional) */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
          <span className="text-sm font-bold text-white block">Poster Image (Optional)</span>
          {posterImage ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle group bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterImage.url} alt="Poster" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-semibold rounded-lg"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('poster')}
                  className="px-3 py-1.5 bg-error/70 hover:bg-error backdrop-blur text-white text-xs font-semibold rounded-lg"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => remainingSlots > 0 && posterInputRef.current?.click()}
              className={`aspect-video rounded-xl border-2 border-dashed border-border-subtle hover:border-accent-purple/50 cursor-pointer flex flex-col items-center justify-center text-center p-4 bg-white/2 hover:bg-white/3 ${
                remainingSlots === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span className="text-xs text-text-secondary font-medium">Upload Poster</span>
              <span className="text-[10px] text-text-muted mt-1">Aspect Ratio 4:3 / vertical</span>
            </div>
          )}
          <input
            ref={posterInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, 'poster');
              e.target.value = '';
            }}
          />
        </div>

        {/* Gallery Upload Actions */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-center">
          <button
            type="button"
            onClick={() => remainingSlots > 0 && galleryInputRef.current?.click()}
            disabled={remainingSlots === 0}
            className="w-full py-4 border-2 border-dashed border-border-subtle hover:border-accent-purple/50 rounded-xl text-xs font-bold text-text-secondary hover:text-white flex flex-col items-center justify-center gap-2 bg-white/2 hover:bg-white/3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>+ Add Gallery Images</span>
            <span className="text-[10px] text-text-muted font-normal">Max {maxTotalImages - 2} photos</span>
          </button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                const countToUpload = Math.min(files.length, remainingSlots);
                for (let i = 0; i < countToUpload; i++) {
                  uploadFile(files[i], 'gallery');
                }
              }
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Gallery Images List with Reordering */}
      {galleryImages.length > 0 && (
        <div className="space-y-3">
          <span className="text-sm font-bold text-white block">Event Gallery ({galleryImages.length})</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {galleryImages.map((img, index) => (
              <div key={img.publicId} className="relative aspect-video rounded-xl overflow-hidden border border-border-subtle bg-black/40 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />

                {/* Mobile/Desktop controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-2">
                  <div className="flex w-full justify-between items-center">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveGalleryItem(index, 'up')}
                      className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-black disabled:opacity-30"
                      title="Move Left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={index === galleryImages.length - 1}
                      onClick={() => moveGalleryItem(index, 'down')}
                      className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-black disabled:opacity-30"
                      title="Move Right"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="px-3 py-1 bg-error/70 hover:bg-error backdrop-blur text-white text-[10px] font-bold rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading progress list */}
      {uploads.length > 0 && (
        <div className="space-y-2.5 pt-4 border-t border-white/5">
          <span className="text-xs font-bold text-white block">Active Uploads</span>
          <div className="space-y-2">
            {uploads.map((up) => (
              <div key={up.id} className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate font-medium">{up.name}</p>
                  {up.state === 'uploading' && (
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-accent-purple" style={{ width: `${up.progress}%` }} />
                    </div>
                  )}
                  {up.state === 'error' && (
                    <p className="text-error mt-0.5 font-semibold">{up.error || 'Upload failed'}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">{up.state === 'uploading' ? `${up.progress}%` : up.state.toUpperCase()}</span>
                  {up.state !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => clearUpload(up.id)}
                      className="text-text-muted hover:text-white"
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
  );
}
