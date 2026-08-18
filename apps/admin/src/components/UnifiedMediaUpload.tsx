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
  bannerImage?: CloudinaryAsset | null;
  posterImage?: CloudinaryAsset | null;
  galleryImages?: CloudinaryAsset[];
  onChange?: (
    banner: CloudinaryAsset | null,
    poster: CloudinaryAsset | null,
    gallery: CloudinaryAsset[]
  ) => void;
  maxTotalImages?: number;
  triggerOnly?: boolean;
  onUploadsSuccess?: (assets: CloudinaryAsset[]) => void;
  disabled?: boolean;
}

type UploadProgress = { id: string; name: string; progress: number; state: 'uploading' | 'success' | 'error'; error?: string };

export function UnifiedMediaUpload({
  bannerImage = null,
  posterImage = null,
  galleryImages = [],
  onChange,
  maxTotalImages = 15,
  triggerOnly = false,
  onUploadsSuccess,
  disabled = false,
}: UnifiedMediaUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [warningMessage, setWarningMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = (bannerImage ? 1 : 0) + (posterImage ? 1 : 0) + galleryImages.length;
  const remainingSlots = triggerOnly ? 999 : Math.max(0, maxTotalImages - totalCount);

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
    return uploads.some((up) => up.id === fingerprint && up.state === 'uploading');
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
          timeout: 300000,
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

      if (triggerOnly) {
        onUploadsSuccess?.([newAsset]);
        setUploads((prev) => prev.map((u) => (u.id === fingerprint ? { ...u, state: 'success', progress: 100 } : u)));
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
      setUploads((prev) => prev.map((u) => (u.id === fingerprint ? { ...u, state: 'error', error: typeof msg === 'string' ? msg : 'Upload failed' } : u)));
    }
  }, [allImages, bannerImage, posterImage, galleryImages, isDuplicateFile, onChange, onUploadsSuccess, triggerOnly]);

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
      onChange?.(null, posterImage, galleryImages);
    } else if (item.role === 'poster') {
      onChange?.(bannerImage, null, galleryImages);
    } else {
      onChange?.(bannerImage, posterImage, galleryImages.filter((_, idx) => idx !== item.index));
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

  if (triggerOnly) {
    return (
      <div className="space-y-4">
        {warningMessage && (
          <div aria-live="polite" className="px-4 py-2 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400">
            {warningMessage}
          </div>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled) {
              const files = e.dataTransfer.files;
              if (files) {
                for (let i = 0; i < files.length; i++) {
                  uploadFile(files[i]);
                }
              }
            }
          }}
          onClick={() => {
            if (!disabled && uploads.length === 0) {
              inputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-colors ${
            disabled
              ? 'border-border-subtle/50 bg-surface-elevated/40 opacity-40 cursor-not-allowed'
              : isDragging
              ? 'border-accent-purple bg-accent-purple/5'
              : 'border-border-subtle bg-surface-elevated hover:bg-surface-elevated/80 hover:border-text-muted cursor-pointer'
          } ${uploads.length > 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          <div className="text-3xl sm:text-4xl mb-3">
            {disabled ? '🔒' : '📤'}
          </div>
          <h3 className="text-white font-medium text-sm sm:text-base mb-1">
            {disabled ? 'Gallery Uploads Locked' : 'Upload Gallery Images'}
          </h3>
          <p className="text-text-muted text-xs sm:text-sm mb-4">
            {disabled ? 'This event has not completed yet' : 'Drag & drop images here or click to browse'}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                for (let i = 0; i < files.length; i++) {
                  uploadFile(files[i]);
                }
              }
              e.target.value = '';
            }}
          />

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="mt-6 max-w-sm mx-auto space-y-2 text-left">
              {uploads.map((up) => (
                <div key={up.id} className="bg-background-dark p-3 rounded-lg border border-border-subtle">
                  <div className="flex justify-between text-xs text-text-muted mb-2">
                    <span className="truncate pr-4">{up.name}</span>
                    <span>{up.progress}%</span>
                  </div>
                  <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        up.state === 'error' ? 'bg-red-500' : 'bg-accent-purple'
                      }`}
                      style={{ width: `${up.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warningMessage && (
        <div aria-live="polite" className="px-4 py-2 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400">
          {warningMessage}
        </div>
      )}

      {/* Grid Container */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
          isDragging
            ? 'border-accent-purple bg-accent-purple/5'
            : 'border-border-subtle bg-background-dark/30'
        }`}
      >
        {/* Upload Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-accent-purple/10 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20 pointer-events-none border border-accent-purple/50">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple mx-auto animate-bounce">
                <UploadIcon />
              </div>
              <p className="text-white font-bold text-sm">Drop images here to upload</p>
            </div>
          </div>
        )}

        {/* 1. Uploaded Images */}
        {allImages.map((item, i) => (
          <div
            key={item.asset.publicId}
            className={`group relative aspect-square rounded-2xl overflow-hidden border bg-background-dark/80 transition-all ${
              item.role === 'banner'
                ? 'border-accent-purple ring-2 ring-accent-purple/40 ring-offset-2 ring-offset-background-dark'
                : item.role === 'poster'
                ? 'border-accent-blue ring-2 ring-accent-blue/40 ring-offset-2 ring-offset-background-dark'
                : 'border-border-subtle hover:border-accent-purple/50'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.asset.url}
              alt={`Media ${i}`}
              className="w-full h-full object-cover"
            />

            {/* Role Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
              {item.role === 'banner' && (
                <span className="px-2 py-0.5 bg-accent-purple text-white text-[9px] font-black rounded-md shadow-lg uppercase tracking-wider">
                  Banner
                </span>
              )}
              {item.role === 'poster' && (
                <span className="px-2 py-0.5 bg-accent-blue text-white text-[9px] font-black rounded-md shadow-lg uppercase tracking-wider">
                  Poster
                </span>
              )}
              {item.role === 'gallery' && i === 0 && !bannerImage && (
                <span className="px-2 py-0.5 bg-accent-purple/40 text-white text-[9px] font-bold rounded-md shadow-lg border border-accent-purple/20 uppercase tracking-wider backdrop-blur-sm">
                  Auto Banner
                </span>
              )}
            </div>

            {/* Hover Actions Panel */}
            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-3 z-10">
              {item.role !== 'banner' && (
                <button
                  type="button"
                  onClick={() => makeBanner(item)}
                  className="w-full py-1 text-[10px] font-black bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg transition-colors uppercase tracking-wider"
                >
                  Make Banner
                </button>
              )}
              {item.role !== 'poster' && (
                <button
                  type="button"
                  onClick={() => makePoster(item)}
                  className="w-full py-1 text-[10px] font-black bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg transition-colors uppercase tracking-wider"
                >
                  Make Poster
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="w-full py-1 text-[10px] font-black bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors uppercase tracking-wider mt-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {/* 2. Active Uploads */}
        {uploads.map((up) => (
          <div
            key={up.id}
            className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-3 text-center ${
              up.state === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-border-subtle bg-white/2'
            }`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => clearUpload(up.id)}
              className="absolute top-2 right-2 text-text-muted hover:text-white p-1 text-xs"
              aria-label="Remove upload card"
            >
              ✕
            </button>

            {up.state === 'uploading' ? (
              <div className="space-y-3 w-full px-2">
                <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-accent-purple/20 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-accent-purple border-t-transparent animate-spin" />
                  <span className="text-[10px] font-bold text-accent-purple">{up.progress}%</span>
                </div>
                <div className="text-[10px] text-text-muted truncate w-full" title={up.name}>
                  {up.name}
                </div>
              </div>
            ) : up.state === 'success' ? (
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  ✓
                </div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Completed</div>
              </div>
            ) : (
              <div className="space-y-1 w-full px-1">
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400 font-bold">
                  !
                </div>
                <div className="text-[9px] text-red-400 font-medium leading-tight line-clamp-2">
                  {up.error || 'Failed'}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 3. Upload Trigger Dotted Card */}
        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle hover:border-accent-purple/50 bg-white/2 hover:bg-white/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple"
          >
            <div className="text-text-muted text-3xl font-light hover:text-white transition-colors">
              +
            </div>
            <div className="text-text-muted text-xs font-medium">
              {totalCount}/{maxTotalImages}
            </div>
          </button>
        )}
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
