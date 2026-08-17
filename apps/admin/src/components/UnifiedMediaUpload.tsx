'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { adminApiClient } from '@/lib/api/client';


export interface CloudinaryAsset {
  url: string;
  publicId: string;
  hash?: string;
  alt?: string;
}

interface UnifiedMediaUploadProps {
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

export function UnifiedMediaUpload({
  bannerImage,
  posterImage,
  galleryImages,
  onChange,
  maxTotalImages = 15,
}: UnifiedMediaUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [warningMessage, setWarningMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = (bannerImage ? 1 : 0) + (posterImage ? 1 : 0) + galleryImages.length;
  const remainingSlots = Math.max(0, maxTotalImages - totalCount);

  // Flatten images for the unified gallery view
  const allImages = useMemo(() => {
    const images: Array<{ asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }> = [];
    if (bannerImage) images.push({ asset: bannerImage, role: 'banner', index: -1 });
    if (posterImage) images.push({ asset: posterImage, role: 'poster', index: -1 });
    galleryImages.forEach((img, idx) => images.push({ asset: img, role: 'gallery', index: idx }));
    return images;
  }, [bannerImage, posterImage, galleryImages]);

  const isDuplicateFile = useCallback((file: File): boolean => {
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
    return uploads.some((up) => up.id === fingerprint);
  }, [uploads]);

  const uploadFile = useCallback(async (file: File) => {
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

    const newUpload: UploadProgress = { id: fingerprint, name: file.name, progress: 0, state: 'uploading' };
    setUploads((prev) => [...prev, newUpload]);
    setWarningMessage('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const sessionId = 'session_' + crypto.randomUUID().slice(0, 8);

      const { data: uploadRes } = await adminApiClient.post<{ data: { url: string; publicId: string; hash: string } }>(
        `/admin/uploads/image?folder=events&sessionId=${sessionId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              setUploads((prev) => prev.map((u) => (u.id === fingerprint ? { ...u, progress: pct } : u)));
            }
          },
        }
      );

      const newAsset: CloudinaryAsset = {
        url: uploadRes.data.url,
        publicId: uploadRes.data.publicId,
        hash: uploadRes.data.hash,
      };

      // Check for duplicates
      const isDuplicateAsset = allImages.some(
        (item) => item.asset.publicId === newAsset.publicId || (item.asset.hash && item.asset.hash === newAsset.hash)
      );

      if (isDuplicateAsset) {
        setWarningMessage('Duplicate image detected. File will not be added.');
        setUploads((prev) => prev.map((u) => u.id === fingerprint ? { ...u, state: 'error', error: 'Duplicate image detected' } : u));
        adminApiClient.delete('/admin/uploads', { data: { publicId: newAsset.publicId } }).catch(() => {});
        return;
      }

      // Add as gallery image initially. The fallback logic will automatically handle if banner is null on save.
      onChange(bannerImage, posterImage, [...galleryImages, newAsset]);

      setUploads((prev) => prev.map((u) => (u.id === fingerprint ? { ...u, state: 'success', progress: 100 } : u)));
    } catch (err) {
      console.error('[UnifiedMediaUpload] Upload failed:', err);
      setUploads((prev) => prev.map((u) => u.id === fingerprint ? { ...u, state: 'error', error: 'Upload failed' } : u));
    }
  }, [allImages, bannerImage, posterImage, galleryImages, isDuplicateFile, onChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files) {
        const countToUpload = Math.min(files.length, remainingSlots);
        for (let i = 0; i < countToUpload; i++) {
          uploadFile(files[i]);
        }
      }
    },
    [remainingSlots, uploadFile]
  );

  const handleRemove = (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => {
    setWarningMessage('');
    adminApiClient.delete('/admin/uploads', { data: { publicId: item.asset.publicId } }).catch(() => {});

    if (item.role === 'banner') {
      onChange(null, posterImage, galleryImages);
    } else if (item.role === 'poster') {
      onChange(bannerImage, null, galleryImages);
    } else {
      onChange(bannerImage, posterImage, galleryImages.filter((_, idx) => idx !== item.index));
    }
  };

  const makeBanner = (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => {
    if (item.role === 'banner') return; // Already banner

    const newGallery = [...galleryImages];
    if (item.role === 'gallery') {
      newGallery.splice(item.index, 1); // Remove from gallery
    }

    // If there was an old banner, push it to gallery
    if (bannerImage) {
      newGallery.push(bannerImage);
    }

    if (item.role === 'poster') {
      onChange(item.asset, null, newGallery); // Moves poster to banner, clears poster
    } else {
      onChange(item.asset, posterImage, newGallery);
    }
  };

  const makePoster = (item: { asset: CloudinaryAsset; role: 'banner' | 'poster' | 'gallery'; index: number }) => {
    if (item.role === 'poster') return; // Already poster

    const newGallery = [...galleryImages];
    if (item.role === 'gallery') {
      newGallery.splice(item.index, 1); // Remove from gallery
    }

    // If there was an old poster, push it to gallery
    if (posterImage) {
      newGallery.push(posterImage);
    }

    if (item.role === 'banner') {
      onChange(null, item.asset, newGallery); // Moves banner to poster, clears banner
    } else {
      onChange(bannerImage, item.asset, newGallery);
    }
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

      <div className="flex justify-between items-center text-xs text-text-muted">
        <span>Image Slots: {totalCount} / {maxTotalImages} occupied</span>
        <span>{remainingSlots} slots remaining</span>
      </div>

      {/* Unified Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => remainingSlots > 0 && inputRef.current?.click()}
        className={`aspect-[3/1] md:aspect-[4/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-accent-purple bg-accent-purple/10'
            : 'border-border-subtle hover:border-accent-purple/50 hover:bg-white/2'
        } ${remainingSlots === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
          <UploadIcon />
        </div>
        <div className="text-center">
          <p className="text-text-secondary text-base font-semibold">
            Drop images here or <span className="text-accent-purple">browse</span>
          </p>
          <p className="text-text-muted text-xs mt-1">Upload multiple photos at once. JPG, PNG, WEBP — max 5MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            const countToUpload = Math.min(files.length, remainingSlots);
            for (let i = 0; i < countToUpload; i++) {
              uploadFile(files[i]);
            }
          }
          e.target.value = '';
        }}
      />

      {/* Active Uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2.5 pt-4">
          <span className="text-xs font-bold text-white block">Active Uploads</span>
          <div className="space-y-2">
            {uploads.map((up) => (
              <div key={up.id} className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-4 text-xs">
                <span className="text-text-secondary truncate max-w-[200px]">{up.name}</span>
                {up.state === 'uploading' ? (
                  <div className="flex-1 max-w-[150px] h-1.5 bg-background-card rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-brand transition-all duration-300" style={{ width: `${up.progress}%` }} />
                  </div>
                ) : up.state === 'success' ? (
                  <span className="text-success font-medium">Done</span>
                ) : (
                  <span className="text-error font-medium">{up.error}</span>
                )}
                <button
                  type="button"
                  onClick={() => clearUpload(up.id)}
                  className="text-text-muted hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified Gallery */}
      {allImages.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/5">
          <span className="text-sm font-bold text-white block">Uploaded Media ({allImages.length})</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allImages.map((item, i) => (
              <div key={item.asset.publicId} className={`relative aspect-video rounded-xl overflow-hidden border ${item.role === 'banner' ? 'border-accent-purple border-2' : item.role === 'poster' ? 'border-accent-blue border-2' : 'border-border-subtle'} bg-black/40 group flex flex-col`}>

                {/* Image */}
                <div className="relative flex-1 min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.asset.url} alt={`Media ${i}`} className="w-full h-full object-cover" />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                    {item.role === 'banner' && <span className="px-2 py-0.5 bg-accent-purple/90 text-white text-[10px] font-bold rounded shadow-lg backdrop-blur">Banner</span>}
                    {item.role === 'poster' && <span className="px-2 py-0.5 bg-accent-blue/90 text-white text-[10px] font-bold rounded shadow-lg backdrop-blur">Poster</span>}
                    {item.role === 'gallery' && i === 0 && !bannerImage && (
                      <span className="px-2 py-0.5 bg-accent-purple/50 text-white text-[10px] font-bold rounded shadow-lg backdrop-blur border border-accent-purple/30">Auto Banner</span>
                    )}
                  </div>

                  {/* Hover Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    {item.role !== 'banner' && (
                      <button
                        type="button"
                        onClick={() => makeBanner(item)}
                        className="px-3 py-1.5 w-3/4 bg-accent-purple/80 hover:bg-accent-purple text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Make Banner
                      </button>
                    )}
                    {item.role !== 'poster' && (
                      <button
                        type="button"
                        onClick={() => makePoster(item)}
                        className="px-3 py-1.5 w-3/4 bg-accent-blue/80 hover:bg-accent-blue text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Make Poster
                      </button>
                    )}
                  </div>
                </div>

                {/* Always visible remove button bar */}
                <div className="h-8 bg-black/50 border-t border-white/10 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="text-error/80 hover:text-error text-[10px] font-bold uppercase tracking-wider w-full h-full transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
