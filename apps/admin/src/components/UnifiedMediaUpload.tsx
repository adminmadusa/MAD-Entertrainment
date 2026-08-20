'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { adminApiClient } from '@/lib/api/client';

import {
  useUnifiedMediaUpload,
  type CloudinaryAsset,
} from './media/useUnifiedMediaUpload';
import { MediaAssetGridItem } from './media/MediaAssetGridItem';
import { ActiveUploadCard } from './media/ActiveUploadCard';
import { UnifiedMediaTriggerView } from './media/UnifiedMediaTriggerView';

export type { CloudinaryAsset };

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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = (bannerImage ? 1 : 0) + (posterImage ? 1 : 0) + galleryImages.length;
  const remainingSlots = triggerOnly ? 999 : Math.max(0, maxTotalImages - totalCount);

  // Flatten images for the unified gallery view
  const allImages = useMemo(() => {
    const images: Array<{
      asset: CloudinaryAsset;
      role: 'banner' | 'poster' | 'gallery';
      index: number;
    }> = [];
    if (bannerImage) images.push({ asset: bannerImage, role: 'banner', index: -1 });
    if (posterImage) images.push({ asset: posterImage, role: 'poster', index: -1 });
    galleryImages.forEach((img, idx) => images.push({ asset: img, role: 'gallery', index: idx }));
    return images;
  }, [bannerImage, posterImage, galleryImages]);

  const { uploads, warningMessage, setWarningMessage, uploadFile, clearUpload } =
    useUnifiedMediaUpload({
      bannerImage,
      posterImage,
      galleryImages,
      onChange,
      triggerOnly,
      onUploadsSuccess,
      allImages,
    });

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

  const handleRemove = (item: {
    asset: CloudinaryAsset;
    role: 'banner' | 'poster' | 'gallery';
    index: number;
  }) => {
    setWarningMessage('');
    adminApiClient
      .delete('/admin/uploads', { data: { publicId: item.asset.publicId } })
      .catch(() => {});

    if (item.role === 'banner') {
      onChange?.(null, posterImage, galleryImages);
    } else if (item.role === 'poster') {
      onChange?.(bannerImage, null, galleryImages);
    } else {
      onChange?.(bannerImage, posterImage, galleryImages.filter((_, idx) => idx !== item.index));
    }
  };

  const makeBanner = (item: {
    asset: CloudinaryAsset;
    role: 'banner' | 'poster' | 'gallery';
    index: number;
  }) => {
    if (item.role === 'banner') return;

    const newGallery = [...galleryImages];
    if (item.role === 'gallery') {
      newGallery.splice(item.index, 1);
    }

    if (bannerImage) {
      newGallery.push(bannerImage);
    }

    if (item.role === 'poster') {
      onChange?.(item.asset, null, newGallery);
    } else {
      onChange?.(item.asset, posterImage, newGallery);
    }
  };

  const makePoster = (item: {
    asset: CloudinaryAsset;
    role: 'banner' | 'poster' | 'gallery';
    index: number;
  }) => {
    if (item.role === 'poster') return;

    const newGallery = [...galleryImages];
    if (item.role === 'gallery') {
      newGallery.splice(item.index, 1);
    }

    if (posterImage) {
      newGallery.push(posterImage);
    }

    if (item.role === 'banner') {
      onChange?.(null, item.asset, newGallery);
    } else {
      onChange?.(bannerImage, item.asset, newGallery);
    }
  };

  if (triggerOnly) {
    return (
      <UnifiedMediaTriggerView
        disabled={disabled}
        warningMessage={warningMessage}
        uploads={uploads}
        onUploadFile={uploadFile}
      />
    );
  }

  return (
    <div className="space-y-4">
      {warningMessage && (
        <div
          aria-live="polite"
          className="px-4 py-2 bg-error/10 border border-error/20 rounded-xl text-xs text-red-400"
        >
          {warningMessage}
        </div>
      )}

      {/* Grid Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
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
          <MediaAssetGridItem
            key={item.asset.publicId}
            item={item}
            index={i}
            bannerImage={bannerImage}
            onMakeBanner={makeBanner}
            onMakePoster={makePoster}
            onRemove={handleRemove}
          />
        ))}

        {/* 2. Active Uploads */}
        {uploads.map((up) => (
          <ActiveUploadCard key={up.id} upload={up} onClear={clearUpload} />
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
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
