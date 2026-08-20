'use client';

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { memo, useCallback, useRef, useState } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { Reveal } from '@/components/common/PageTransition';
import { useMounted, useWindowWidth } from '@/hooks/use-window.hook';
import type { Event } from '@mad/types';
import { ArrowLeft, ArrowRight, Skeleton } from '@mad/ui';

interface UpcomingEventsSectionProps {
  initialEvents?: Event[];
  loading?: boolean;
}

export const UpcomingEventsSection = memo(function UpcomingEventsSection({
  initialEvents = [],
  loading = false,
}: UpcomingEventsSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();
  const mounted = useMounted();

  const events = initialEvents;

  // SSR-safe responsive value — defaults to 1024 (desktop) on server,
  // updates to real viewport on mount. Never reads window during render.
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  // SSR Bottleneck Fix: Only calculate 3D transforms after client hydration
  // on desktop devices, when we have more than 1 event.
  const enable3D = mounted && !isMobile && !prefersReducedMotion && events.length > 1;

  const nextSlide = useCallback(() => {
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const prevSlide = useCallback(() => {
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  }, [events.length]);

  // Keyboard navigation within the carousel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        e.preventDefault();
      }
    },
    [nextSlide, prevSlide]
  );

  // Mobile Drag / Swipe handling using Framer Motion gesture metadata
  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (events.length <= 1) return;

      const threshold = 50; // swipe threshold in pixels
      const velocityThreshold = 300; // velocity threshold in px/s

      const isSwipeLeft = info.offset.x < -threshold || info.velocity.x < -velocityThreshold;
      const isSwipeRight = info.offset.x > threshold || info.velocity.x > velocityThreshold;

      if (isSwipeLeft) {
        nextSlide();
      } else if (isSwipeRight) {
        prevSlide();
      }
    },
    [events.length, nextSlide, prevSlide]
  );

  let sectionContent: React.ReactNode;

  if (loading) {
    sectionContent = (
      <div
        className="w-full max-w-6xl mx-auto h-[260px] xs:h-[290px] sm:h-[350px] md:h-[380px] mt-4 sm:mt-6 flex items-center justify-center gap-4 overflow-hidden"
        aria-busy="true"
        aria-label="Loading events"
      >
        <div className="hidden sm:block w-[260px] md:w-[280px] h-[320px] md:h-[350px] glass rounded-2xl border border-border-subtle/30 opacity-40 p-3.5 flex flex-col">
          <Skeleton className="w-full aspect-[16/9] rounded-xl mb-3" />
          <Skeleton className="w-20 h-3 rounded mb-2" />
          <Skeleton className="w-3/4 h-4 rounded mb-2" />
          <Skeleton className="w-full h-9 rounded mt-auto" />
        </div>
        <div className="w-[220px] xs:w-[250px] sm:w-[290px] md:w-[320px] h-[260px] xs:h-[290px] sm:h-[350px] md:h-[380px] glass rounded-2xl border border-accent-purple/30 p-3 flex flex-col shadow-glow">
          <Skeleton className="w-full aspect-[16/9] rounded-xl mb-2.5" />
          <Skeleton className="w-20 sm:w-24 h-3 sm:h-3.5 rounded mb-1.5" />
          <Skeleton className="w-5/6 h-4 sm:h-5 rounded mb-2" />
          <Skeleton className="w-full h-6 sm:h-8 rounded mb-2" />
          <div className="mt-auto pt-2 border-t border-border-subtle/40 flex items-center justify-between">
            <Skeleton className="w-14 sm:w-16 h-4 sm:h-5 rounded" />
            <Skeleton className="w-16 sm:w-20 h-7 sm:h-8 rounded-xl" />
          </div>
        </div>
        <div className="hidden sm:block w-[260px] md:w-[280px] h-[320px] md:h-[350px] glass rounded-2xl border border-border-subtle/30 opacity-40 p-3.5 flex flex-col">
          <Skeleton className="w-full aspect-[16/9] rounded-xl mb-3" />
          <Skeleton className="w-20 h-3 rounded mb-2" />
          <Skeleton className="w-3/4 h-4 rounded mb-2" />
          <Skeleton className="w-full h-9 rounded mt-auto" />
        </div>
      </div>
    );
  } else if (events.length === 0) {
    sectionContent = (
      <div className="text-center py-16 glass rounded-2xl border border-border-subtle" role="status">
        <div className="flex justify-center mb-3 text-accent-purple/60 animate-pulse" aria-hidden="true">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <h3 className="text-white font-bold text-base">No Active Events</h3>
        <p className="text-text-secondary text-xs max-w-xs mx-auto mt-1">
          Check back soon for upcoming shows, DJ nights, and entertainment experiences!
        </p>
      </div>
    );
  } else {
    sectionContent = (
      <div
        ref={containerRef}
        className="relative w-full max-w-6xl mx-auto h-[270px] xs:h-[300px] sm:h-[360px] md:h-[390px] mt-3 sm:mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-2xl"
        style={{ perspective: '1200px' }}
        role="group"
        aria-roledescription="carousel"
        aria-label="Active events"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Visual Screen Reader Instruction */}
        <span className="sr-only">
          Interactive 3D Carousel. Use Left and Right arrow keys to navigate between slides.
        </span>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence initial={false} mode="popLayout">
            {events.map((event, index) => {
              const offset = index - activeIndex;

              // Wrap logic for infinite carousel feel
              let absoluteOffset = offset;
              if (offset > events.length / 2) absoluteOffset -= events.length;
              if (offset < -events.length / 2) absoluteOffset += events.length;

              const isActive = absoluteOffset === 0;

              // Safe server default (1024 width) prevents layout shifts
              const currentWidth = mounted ? windowWidth : 1024;
              const isMobileViewport = currentWidth < 640;
              const spread = isMobileViewport ? 75 : 150;

              // Cover flow 3D math
              const x = absoluteOffset * spread;
              const z = isActive || isMobileViewport ? 0 : -140 - Math.abs(absoluteOffset) * 50;
              let rotateY = 0;
              if (!isActive && !isMobileViewport) {
                rotateY = absoluteOffset > 0 ? -25 : 25;
              }
              let opacity = 1;
              if (!isActive) {
                opacity = isMobileViewport ? 0.35 : Math.max(0, 1 - Math.abs(absoluteOffset) * 0.4);
              }

              let cardScale = 1;
              if (!isActive) {
                cardScale = isMobileViewport ? 0.8 : 0.85;
              }

              const zIndex = 20 - Math.abs(absoluteOffset);

              // Don't render cards that are too far away
              if (Math.abs(absoluteOffset) > 2) return null;

              return (
                <motion.div
                  key={event._id}
                  id={`upcoming-event-slide-${index}`}
                  initial={false}
                  animate={{
                    x,
                    z: enable3D ? z : 0,
                    rotateY: enable3D ? rotateY : 0,
                    opacity,
                    scale: cardScale,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    mass: 1,
                  }}
                  drag={events.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  style={{
                    x,
                    transform: enable3D
                      ? `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg)`
                      : `translateX(${x}px) scale(${cardScale})`,
                    zIndex,
                    position: 'absolute',
                    transformStyle: enable3D ? 'preserve-3d' : 'flat',
                  }}
                  className={`${
                    isActive ? 'pointer-events-auto' : 'pointer-events-none sm:pointer-events-auto'
                  } w-[220px] xs:w-[250px] sm:w-[290px] md:w-[320px] h-[260px] xs:h-[290px] sm:h-[350px] md:h-[380px]`}
                  onClick={() => !isActive && setActiveIndex(index)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${events.length}: ${event.title}`}
                  aria-hidden={!isActive}
                >
                  <EventCard
                    event={event}
                    variant="active"
                    density="compact"
                    priority={index === 0}
                    isActive={isActive}
                    className="h-full w-full"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        {events.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevSlide}
              className="hidden sm:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 min-w-[40px] min-h-[40px] p-2.5 sm:p-3.5 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg items-center justify-center cursor-pointer"
              aria-label="Previous event"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 min-w-[40px] min-h-[40px] p-2.5 sm:p-3.5 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg items-center justify-center cursor-pointer"
              aria-label="Next event"
            >
              <ArrowRight size={18} />
            </button>

            {/* Dots indicator */}
            <div
              className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-30"
              role="tablist"
              aria-label="Carousel slide triggers"
            >
              {events.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  role="tab"
                  aria-controls={`upcoming-event-slide-${idx}`}
                  aria-selected={idx === activeIndex}
                  className="min-h-[28px] min-w-[28px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-full cursor-pointer"
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <span
                    className={`block h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                      idx === activeIndex
                        ? 'bg-accent-purple w-5 sm:w-6 shadow-glow-sm'
                        : 'bg-border-subtle w-1.5 sm:w-2 hover:bg-accent-purple/50'
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section
      className="pt-4 sm:pt-6 pb-8 sm:pb-12 overflow-hidden"
      aria-labelledby="upcoming-events-heading"
    >
      <div className="container-mad">
        <Reveal>
          <div className="flex items-end justify-between mb-4 sm:mb-6">
            <div>
              <p className="text-accent-purple text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
                Don&apos;t Miss Out
              </p>
              <h2 id="upcoming-events-heading" className="text-xl sm:text-display-sm font-black text-white">
                Active Events
              </h2>
            </div>
            <Link
              href="/events"
              id="view-all-events"
              className="text-text-secondary hover:text-accent-purple-light text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 min-h-[36px] sm:min-h-[44px] px-2 py-1 rounded-lg focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:outline-none cursor-pointer"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        {sectionContent}
      </div>
    </section>
  );
});
