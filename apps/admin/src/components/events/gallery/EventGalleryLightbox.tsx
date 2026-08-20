'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import React, { useEffect, useCallback, useState } from 'react';

import type { EventGalleryItem } from '@mad/types';

export interface EventGalleryLightboxProps {
  items: EventGalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

export const EventGalleryLightbox = React.memo(function EventGalleryLightbox({
  items,
  currentIndex,
  onClose,
  onChange,
}: EventGalleryLightboxProps) {
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onChange(currentIndex - 1);
    }
  }, [currentIndex, onChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      onChange(currentIndex + 1);
    }
  }, [currentIndex, items.length, onChange]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, handlePrev, handleNext]);

  // Touch swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || touchStartY === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStart - touchEnd;
    const diffY = touchStartY - touchEndY;

    if (diffY < -80) {
      onClose();
      setTouchStart(null);
      setTouchStartY(null);
      return;
    }

    if (diffX > 50) handleNext();
    if (diffX < -50) handlePrev();

    setTouchStart(null);
    setTouchStartY(null);
  };

  if (!currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
        onClick={onClose}
      >
        {/* Top bar with count & close button */}
        <div
          className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm font-medium">
              {currentIndex + 1} of {items.length}
            </span>
            {currentItem.isCover && (
              <span className="bg-accent-purple/90 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-glow-sm">
                ⭐ Cover Photo
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
            aria-label="Close lightbox"
            type="button"
          >
            <span className="text-lg leading-none font-bold">✕</span>
          </button>
        </div>

        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-50 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
            aria-label="Previous image"
            type="button"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>
        )}

        {/* Next Button */}
        {currentIndex < items.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-50 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
            aria-label="Next image"
            type="button"
          >
            <span className="text-2xl leading-none">›</span>
          </button>
        )}

        {/* Main Image Viewport */}
        <div
          className="relative max-w-5xl max-h-[85vh] w-full h-full flex flex-col items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            key={currentItem.id || currentItem.publicId}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-[70vh] sm:h-[80vh] flex items-center justify-center"
          >
            <Image
              src={currentItem.url}
              alt={currentItem.caption || 'Event gallery photo'}
              fill
              className="object-contain"
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority
            />
          </motion.div>

          {currentItem.caption && (
            <div className="absolute bottom-4 inset-x-4 max-w-xl mx-auto text-center bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <p className="text-white text-xs sm:text-sm">{currentItem.caption}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
