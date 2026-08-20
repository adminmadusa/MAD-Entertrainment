'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import type { EventGalleryItem } from '@mad/types';
import { useCardFan } from './use-card-fan';

export interface CardFanCarouselProps {
  items: EventGalleryItem[];
  onSelectCard?: (index: number) => void;
  className?: string;
}

const ARROW_CLASSES =
  'relative flex items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white/70 cursor-pointer shrink-0 z-30 outline-none shadow-lg hover:border-white/25 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-purple';

export function CardFanCarousel({ items, onSelectCard, className = '' }: CardFanCarouselProps) {
  const {
    containerRef,
    centerIndex,
    cycle,
    needsPagination,
    totalCards,
  } = useCardFan(items);

  // Touch handlers for mobile swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 40) cycle('right');
    if (diff < -40) cycle('left');
    setTouchStart(null);
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') cycle('left');
      if (e.key === 'ArrowRight') cycle('right');
    },
    [cycle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!totalCards) return null;

  return (
    <section
      className={`flex flex-col items-center w-full py-6 lg:py-10 px-4 relative z-20 overflow-hidden select-none ${className}`}
      aria-label="Interactive photo fan carousel"
    >
      <div className="flex items-center justify-center w-full max-w-7xl">
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative flex justify-center items-center w-full h-[22rem] sm:h-[26rem] md:h-[30rem] lg:h-[34rem]"
        >
          {items.map((item, index) => (
            <div
              key={item.id || index}
              onClick={() => onSelectCard?.(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCard?.(index);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View full photo ${index + 1} of ${totalCards}${item.caption ? `: ${item.caption}` : ''}`}
              className="fan-card absolute w-44 sm:w-56 md:w-64 lg:w-72 aspect-[3/4] rounded-2xl overflow-hidden glass border border-white/10 shadow-2xl cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            >
              <ImageWrapper
                src={item.thumbnail || item.url}
                alt={item.caption || `Event moment ${index + 1}`}
                fill
                sizes="(max-width: 640px) 176px, (max-width: 1024px) 256px, 288px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={index < 3}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5">
                <div className="flex justify-end">
                  <span className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/80 border border-white/10">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
                {item.caption && (
                  <span className="text-xs text-white line-clamp-2 font-medium drop-shadow-md">
                    {item.caption}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {needsPagination && (
        <div className="flex items-center justify-center gap-4 mt-2 sm:mt-4 z-30">
          <button
            type="button"
            className={`${ARROW_CLASSES} w-10 h-10 md:w-11 md:h-11`}
            onClick={() => cycle('left')}
            aria-label="Previous photo in carousel"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === centerIndex
                    ? 'w-6 bg-accent-purple shadow-glow-sm'
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            className={`${ARROW_CLASSES} w-10 h-10 md:w-11 md:h-11`}
            onClick={() => cycle('right')}
            aria-label="Next photo in carousel"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
}
