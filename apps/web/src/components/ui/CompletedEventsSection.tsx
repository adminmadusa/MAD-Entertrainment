'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { Reveal } from '@/components/common/PageTransition';
import type { Event } from '@mad/types';
import { ArrowLeft, ArrowRight } from '@mad/ui';

interface CompletedEventsSectionProps {
  initialEvents: Event[];
}

export const CompletedEventsSection = memo(function CompletedEventsSection({
  initialEvents = [],
}: CompletedEventsSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability, { passive: true });

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, initialEvents.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const cardWidth = el.firstElementChild?.clientWidth || 240;
    const scrollAmount = cardWidth * (window.innerWidth >= 1024 ? 3 : 2) + 24;

    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (initialEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12 overflow-hidden bg-background/20" aria-label="Past events gallery" role="region">
      <div className="container-mad">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-pink/10 border border-accent-pink/20 text-accent-pink-light text-xs font-bold uppercase tracking-wider mb-2">
                ✨ Relive the Magic
              </span>
              <h2 className="text-2xl sm:text-display-sm font-black text-white tracking-tight">
                Past Events &amp; <span className="text-gradient">Moments</span>
              </h2>
              <p className="text-text-secondary text-xs sm:text-sm mt-1 max-w-xl">
                Explore photo galleries, recaps, and unforgettable memories from previous MAD Entertrainment experiences.
              </p>
            </div>

            {/* Left / Right Carousel Controls */}
            {initialEvents.length > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pb-1">
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  disabled={!canScrollLeft}
                  aria-label="Previous past events"
                  className="w-10 h-10 rounded-full glass border border-border-subtle text-white hover:text-accent-pink-light hover:border-accent-pink/40 flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  disabled={!canScrollRight}
                  aria-label="Next past events"
                  className="w-10 h-10 rounded-full glass border border-border-subtle text-white hover:text-accent-pink-light hover:border-accent-pink/40 flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink cursor-pointer shadow-sm"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </Reveal>

        {/* Horizontal Carousel Track with Snap Scrolling */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth gap-3 sm:gap-4 pb-4 pt-1 px-1 -mx-1"
          role="region"
          aria-label="Past events carousel"
          tabIndex={0}
        >
          {initialEvents.map((event) => (
            <div
              key={event._id}
              className="w-[200px] xs:w-[220px] sm:w-[240px] md:w-[260px] shrink-0 snap-start flex flex-col"
            >
              <EventCard
                event={event}
                variant="completed"
                density="compact"
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
