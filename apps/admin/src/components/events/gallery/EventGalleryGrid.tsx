'use client';

import Image from 'next/image';
import React, { useState } from 'react';

import { type EventGalleryItem } from '@mad/types';

export interface EventGalleryGridProps {
  eventId: string;
  items: EventGalleryItem[];
  readOnly?: boolean;
}

export const EventGalleryGrid = React.memo(function EventGalleryGrid({
  items,
  readOnly = false,
}: EventGalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border-subtle p-12 text-center">
        <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📸</span>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">No gallery items yet</h3>
        <p className="text-text-muted">Upload your first event photos using the upload zone above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item) => (
        <GalleryGridItem
          key={item.id}
          item={item}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
});

const GalleryGridItem = React.memo(function GalleryGridItem({
  item,
  readOnly,
}: {
  item: EventGalleryItem;
  readOnly: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`glass rounded-2xl border ${
        item.isCover
          ? 'border-accent-purple shadow-[0_0_15px_rgba(139,92,246,0.25)]'
          : 'border-border-subtle'
      } overflow-hidden relative group transition-all duration-300 ${
        readOnly ? '' : 'hover:border-accent-purple/40'
      }`}
    >
      {/* Image Container */}
      <div className="aspect-square w-full relative bg-surface-elevated overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-elevated/60 text-text-muted">
            <span className="text-3xl mb-1.5">🖼️</span>
            <span className="text-xs font-medium tracking-wide">Failed to load media</span>
          </div>
        ) : (
          <Image
            src={item.url}
            alt={item.caption || 'Gallery Image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        )}

        {/* Cover Badge */}
        {item.isCover && (
          <div className="absolute top-3 left-3 bg-accent-purple text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-lg backdrop-blur-sm bg-opacity-90">
            <span>⭐</span> Cover
          </div>
        )}

        {/* Published Badge */}
        {readOnly && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            🔒
          </div>
        )}
      </div>

      {/* Caption (read-only static text) */}
      {item.caption && (
        <div className="px-4 py-3 border-t border-border-subtle">
          <p className="text-text-muted text-sm truncate">{item.caption}</p>
        </div>
      )}
    </div>
  );
});
