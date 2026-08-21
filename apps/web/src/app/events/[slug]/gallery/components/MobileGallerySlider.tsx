'use client';

import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';

import type { EventGalleryItem } from '@mad/types';

export interface MobileGallerySliderProps {
  items: EventGalleryItem[];
  onSelectPhoto: (index: number) => void;
}

export function MobileGallerySlider({ items, onSelectPhoto }: MobileGallerySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    const cardWidth = offsetWidth * 0.78;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, newIndex)));
  };

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.offsetWidth * 0.78;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-3 sm:hidden">
      {/* Swipeable Snap Track */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 px-4 py-2 -mx-4"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {items.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              onClick={() => onSelectPhoto(index)}
              className="relative w-[78vw] max-w-[280px] shrink-0 snap-center aspect-[3/4] rounded-2xl overflow-hidden glass border border-white/10 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple text-left group"
              aria-label={`View photo ${index + 1} of ${items.length}`}
            >
              <Image
                src={item.thumbnail || item.url}
                alt={item.caption || `Event moment ${index + 1}`}
                fill
                sizes="78vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={index < 2}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4">
                <div className="flex justify-end">
                  <span className="p-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white/80 border border-white/10">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-accent-purple-light font-bold uppercase tracking-wider block mb-1">
                    Photo {index + 1} of {items.length}
                  </span>
                  {item.caption && (
                    <p className="text-xs text-white font-medium line-clamp-2 drop-shadow-md">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Floating Quick Step Arrows */}
        {items.length > 1 && (
          <>
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={() => scrollTo('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-20 cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeIndex < items.length - 1 && (
              <button
                type="button"
                onClick={() => scrollTo('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-20 cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Pagination Dot Indicators */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-1">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 bg-accent-purple shadow-glow-sm'
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
