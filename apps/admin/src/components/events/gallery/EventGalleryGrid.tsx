'use client';

import React, { useRef, useState } from 'react';

import { Button } from '@mad/ui';
import type { EventGalleryItem } from '@mad/types';

import { EventGalleryLightbox } from './EventGalleryLightbox';
import { EventGalleryThumbnailItem } from './EventGalleryThumbnailItem';

export interface EventGalleryGridProps {
  eventId: string;
  items: EventGalleryItem[];
  onUpload?: (files: File[]) => void;
  onSetCover?: (item: EventGalleryItem) => void;
  onDelete?: (item: EventGalleryItem) => void;
  isUploading?: boolean;
  isMutating?: boolean;
  canUpload?: boolean;
}

export const EventGalleryGrid = React.memo(function EventGalleryGrid({
  items,
  onUpload,
  onSetCover,
  onDelete,
  isUploading = false,
  isMutating = false,
  canUpload = true,
}: EventGalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload?.(Array.from(files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        onUpload?.(imageFiles);
      }
    }
  };

  return (
    <div
      className={`relative transition-colors duration-200 ${
        isDragging ? 'ring-2 ring-accent-purple ring-offset-2 ring-offset-background-dark rounded-2xl' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg,image/pjpeg,image/x-png,image/avif,image/heic,image/heif"
        className="hidden"
        onChange={handleFileChange}
        disabled={!canUpload || isUploading}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* + Add Photos Tile */}
        {canUpload && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isMutating}
            className={`aspect-square h-auto w-full rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-2 text-center group focus:outline-none focus:ring-2 focus:ring-accent-purple ${
              isUploading
                ? 'border-accent-purple/50 bg-accent-purple/5 cursor-wait'
                : isDragging
                ? 'border-accent-purple bg-accent-purple/15 scale-[1.02]'
                : 'border-border-subtle hover:border-accent-purple/70 bg-surface-elevated/20 hover:bg-surface-elevated/40'
            }`}
            aria-label="Upload photos"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] sm:text-xs text-accent-purple font-semibold">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 group-hover:bg-accent-purple/20 text-white/70 group-hover:text-accent-purple-light flex items-center justify-center transition-colors">
                  <span className="text-xl sm:text-2xl font-light leading-none">+</span>
                </div>
                <span className="text-[11px] sm:text-xs text-text-secondary group-hover:text-white font-medium transition-colors">
                  Add Photos
                </span>
              </div>
            )}
          </Button>
        )}

        {/* Existing Thumbnail Items */}
        {items.map((item, index) => (
          <EventGalleryThumbnailItem
            key={item.id || item.publicId || index}
            item={item}
            isMutating={isMutating}
            onPreview={() => setLightboxIndex(index)}
            onSetCover={onSetCover}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Empty State when no items and cannot upload */}
      {items.length === 0 && !canUpload && (
        <div className="glass rounded-2xl border border-border-subtle p-12 text-center">
          <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📸</span>
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">No gallery items yet</h3>
          <p className="text-text-muted text-sm">Gallery uploads are not available for this event.</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <EventGalleryLightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}
    </div>
  );
});
