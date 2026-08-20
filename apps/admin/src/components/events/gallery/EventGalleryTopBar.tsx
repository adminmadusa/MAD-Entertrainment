'use client';

import React from 'react';

export interface EventGalleryTopBarProps {
  itemCount: number;
  maxPhotos: number;
  isPublished: boolean;
  isUpdating: boolean;
  onTogglePublish: () => void;
}

export const EventGalleryTopBar = React.memo(function EventGalleryTopBar({
  itemCount,
  maxPhotos,
  isPublished,
  isUpdating,
  onTogglePublish,
}: EventGalleryTopBarProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      {/* Left: Stats & Status */}
      <div className="flex items-center gap-3">
        <span className="text-xs sm:text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-full border border-white/10">
          {itemCount} / {maxPhotos} Photos
        </span>
        <span
          className={`text-xs sm:text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 border ${
            isPublished
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-white/5 text-text-muted border-white/10'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-text-muted'
            }`}
          />
          {isPublished ? 'Live on Website' : 'Hidden from Website'}
        </span>
      </div>

      {/* Right: Publish Toggle Control */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-semibold text-white">
            {isPublished ? 'Published' : 'Unpublished'}
          </div>
          <div className="text-[10px] text-text-muted">
            {isPublished ? 'Publicly visible' : 'Hidden from public'}
          </div>
        </div>

        <button
          type="button"
          onClick={onTogglePublish}
          disabled={isUpdating}
          aria-label={isPublished ? 'Unpublish gallery' : 'Publish gallery'}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-purple ${
            isPublished ? 'bg-accent-purple' : 'bg-surface-elevated'
          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isPublished ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
});
