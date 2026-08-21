'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { EventGalleryItem } from '@mad/types';

interface LightboxProps {
  items: EventGalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

export function Lightbox({ items, currentIndex, onClose, onChange }: LightboxProps) {
  const [mounted, setMounted] = useState(false);
  const currentItem = items[currentIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

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
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, handlePrev, handleNext]);

  // Swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || touchStartY === null) return;
    const diffX = touchStart - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;

    if (diffY < -70) {
      onClose();
      setTouchStart(null);
      setTouchStartY(null);
      return;
    }

    if (diffX > 40) handleNext();
    if (diffX < -40) handlePrev();

    setTouchStart(null);
    setTouchStartY(null);
  };

  if (!mounted || !currentItem) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-2xl select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
        onClick={onClose}
      >
        {/* Top Controls: Counter & Close Button */}
        <div className="fixed top-4 left-4 right-4 z-[100000] flex items-center justify-between pointer-events-none">
          <div className="px-3.5 py-1.5 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white/90 text-xs sm:text-sm font-semibold tracking-wide shadow-xl pointer-events-auto">
            {currentIndex + 1} / {items.length}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-11 h-11 flex items-center justify-center text-white bg-black/75 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full transition-all border border-white/20 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer pointer-events-auto"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-[100000] w-11 h-11 flex items-center justify-center text-white/90 hover:text-white bg-black/70 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xl cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < items.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-[100000] w-11 h-11 flex items-center justify-center text-white/90 hover:text-white bg-black/70 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xl cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Center Image Container — clicking anywhere around photo dismisses */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 md:p-12"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-5xl h-[70vh] sm:h-[80vh] flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentItem.url}
              alt={currentItem.caption || `Image ${currentIndex + 1}`}
              fill
              className="object-contain select-none pointer-events-none drop-shadow-2xl"
              priority
              sizes="100vw"
            />

            {/* Caption */}
            {currentItem.caption && (
              <div className="absolute -bottom-2 sm:bottom-2 left-0 right-0 text-center px-4">
                <span className="inline-block px-4 py-2 bg-black/80 backdrop-blur-md border border-white/15 text-white rounded-xl text-xs sm:text-sm max-w-xl shadow-2xl select-none">
                  {currentItem.caption}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Preload adjacent images */}
        <div className="hidden">
          {currentIndex > 0 && (
            <Image src={items[currentIndex - 1].url} alt="preload prev" width={1} height={1} priority />
          )}
          {currentIndex < items.length - 1 && (
            <Image src={items[currentIndex + 1].url} alt="preload next" width={1} height={1} priority />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
