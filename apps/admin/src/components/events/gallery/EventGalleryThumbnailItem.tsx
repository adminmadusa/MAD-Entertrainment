'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Button } from '@mad/ui';
import type { EventGalleryItem } from '@mad/types';

export interface EventGalleryThumbnailItemProps {
  item: EventGalleryItem;
  isMutating?: boolean;
  onPreview: () => void;
  onSetCover?: (item: EventGalleryItem) => void;
  onDelete?: (item: EventGalleryItem) => void;
}

export const EventGalleryThumbnailItem = React.memo(function EventGalleryThumbnailItem({
  item,
  isMutating = false,
  onPreview,
  onSetCover,
  onDelete,
}: EventGalleryThumbnailItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`aspect-square w-full relative rounded-xl border overflow-hidden group transition-all duration-200 bg-surface-elevated/40 ${
        item.isCover
          ? 'border-accent-purple/80 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
          : 'border-border-subtle hover:border-white/40'
      }`}
    >
      {imgError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted p-1">
          <span className="text-lg">🖼️</span>
          <span className="text-[9px] text-center mt-0.5">Error</span>
        </div>
      ) : (
        <Image
          src={item.thumbnail || item.url}
          alt={item.caption || 'Gallery thumbnail'}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 160px"
          onError={() => setImgError(true)}
        />
      )}

      {/* Star Cover Badge */}
      {item.isCover && (
        <div className="absolute top-1.5 left-1.5 bg-accent-purple/90 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 shadow backdrop-blur-sm z-10">
          <span>⭐</span>
          <span>Cover</span>
        </div>
      )}

      {/* Hover / Focus Action Panel */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2.5 z-20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="w-full py-1 text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center justify-center gap-1 border-0"
          aria-label="Preview image full screen"
        >
          <span>🔍</span>
          <span>Preview</span>
        </Button>

        {!item.isCover && onSetCover && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSetCover(item)}
            disabled={isMutating}
            className="w-full py-1 text-[11px] font-semibold text-accent-purple-light bg-accent-purple/25 hover:bg-accent-purple/40 border border-accent-purple/40 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            aria-label="Set photo as event cover"
          >
            <span>⭐</span>
            <span>Set as Cover</span>
          </Button>
        )}

        {onDelete && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onDelete(item)}
            disabled={isMutating}
            className="w-full py-1 text-[11px] font-semibold text-red-300 bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            aria-label="Delete photo from gallery"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
});
