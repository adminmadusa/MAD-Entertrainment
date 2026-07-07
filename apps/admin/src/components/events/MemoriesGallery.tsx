'use client';

import React from 'react';

import { MAX_MEMORIES_GALLERY_LIMIT } from '@mad/shared';

import { type MemoryGalleryItem, type UploadEntry } from './event-memories.types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface MemoriesGalleryProps {
  gallery: MemoryGalleryItem[];
  uploads: UploadEntry[];
  remainingSlots: number;
  galleryInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (files: FileList) => void;
  onMove: (idx: number, dir: 'up' | 'down') => void;
  onRemove: (idx: number) => void;
  onClearUpload: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MemoriesGallery({
  gallery,
  uploads,
  remainingSlots,
  galleryInputRef,
  onFileChange,
  onMove,
  onRemove,
  onClearUpload,
}: MemoriesGalleryProps) {
  const handleKeyboardReorder = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
    dir: 'up' | 'down'
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMove(idx, dir);
    }
  };

  return (
    <div className="space-y-3">
      {/* Gallery header */}
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

      {/* Hidden file input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) onFileChange(files);
          e.target.value = '';
        }}
      />

      {/* Gallery grid or empty state */}
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
                    onClick={() => onMove(idx, 'up')}
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
                    onClick={() => onMove(idx, 'down')}
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
                  onClick={() => onRemove(idx)}
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
                      onClick={() => onClearUpload(up.id)}
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
  );
}
