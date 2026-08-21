'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useCallback } from 'react';

import type { EventGalleryItem } from '@mad/types';

interface LightboxProps {
  items: EventGalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

export function Lightbox({ items, currentIndex, onClose, onChange }: LightboxProps) {
  const currentItem = items[currentIndex];

  // Navigation handlers
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

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, handlePrev, handleNext]);

  // Swipe support using simple touch events
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchStartY, setTouchStartY] = React.useState<number | null>(null);

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

    // Swipe down to dismiss (vertical takes priority)
    if (diffY < -80) {
      onClose();
      setTouchStart(null);
      setTouchStartY(null);
      return;
    }

    // Swipe left (next)
    if (diffX > 50) handleNext();
    // Swipe right (prev)
    if (diffX < -50) handlePrev();

    setTouchStart(null);
    setTouchStartY(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full transition-colors border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Counter */}
        <div className="absolute top-5 left-6 z-50 px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white/90 text-xs sm:text-sm font-semibold tracking-wide select-none">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Main Image Area Container — backdrop clicks pass through to outer overlay to close */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 md:p-12 pointer-events-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Previous Button */}
          {currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 md:left-8 z-50 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white hidden md:flex items-center justify-center pointer-events-auto shadow-lg cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Current Image Content */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center pointer-events-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={currentItem.url}
                alt={currentItem.caption || `Image ${currentIndex + 1}`}
                fill
                className="object-contain select-none"
                priority
                sizes="100vw"
              />
            </div>

            {/* Caption */}
            {currentItem.caption && (
              <div className="absolute bottom-4 left-0 right-0 text-center px-4 pointer-events-auto">
                <span className="inline-block px-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 text-white rounded-xl text-xs sm:text-sm max-w-2xl shadow-lg select-none">
                  {currentItem.caption}
                </span>
              </div>
            )}
          </motion.div>

          {/* Next Button */}
          {currentIndex < items.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 md:right-8 z-50 p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white hidden md:flex items-center justify-center pointer-events-auto shadow-lg cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Preload Next/Prev Images invisibly */}
          <div className="hidden">
            {currentIndex > 0 && (
              <Image
                src={items[currentIndex - 1].url}
                alt="preload previous"
                width={10}
                height={10}
                priority
              />
            )}
            {currentIndex < items.length - 1 && (
              <Image
                src={items[currentIndex + 1].url}
                alt="preload next"
                width={10}
                height={10}
                priority
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
