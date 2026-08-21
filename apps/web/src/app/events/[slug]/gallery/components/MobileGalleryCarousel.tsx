'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';

import type { EventGalleryItem } from '@mad/types';

export interface MobileGalleryCarouselProps {
  items: EventGalleryItem[];
  onSelectPhoto: (index: number) => void;
}

export function MobileGalleryCarousel({ items, onSelectPhoto }: MobileGalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft } = scrollRef.current;
    const cardStep = 210;
    const newIndex = Math.round(scrollLeft / cardStep);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, newIndex)));
  };

  const scrollTo = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardStep = 210;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -cardStep : cardStep,
      behavior: 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 sm:hidden">
      {/* Horizontal Swipeable Track */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-2.5 px-4 py-1.5 -mx-4"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {items.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              onClick={() => onSelectPhoto(index)}
              className="relative w-[56vw] max-w-[210px] shrink-0 snap-start aspect-[4/3] rounded-xl overflow-hidden glass border border-white/10 shadow-lg active:scale-[0.98] transition-all text-left group focus-visible:ring-2 focus-visible:ring-accent-purple cursor-pointer"
              aria-label={`View photo ${index + 1} of ${items.length}`}
            >
              <Image
                src={item.thumbnail || item.url}
                alt={item.caption || `Photo ${index + 1}`}
                fill
                sizes="56vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={index < 3}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/wQAAgMBBNN+f6YAAAAASUVORK5CYII="
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                {item.caption && (
                  <span className="text-[10px] text-white line-clamp-1 font-medium">
                    {item.caption}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Floating Quick Step Arrows */}
        {items.length > 2 && (
          <>
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={() => scrollTo('left')}
                className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-20 cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {activeIndex < items.length - 2 && (
              <button
                type="button"
                onClick={() => scrollTo('right')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all z-20 cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Pagination Dot Indicators */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-0.5" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-5 bg-accent-purple shadow-glow-sm'
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
