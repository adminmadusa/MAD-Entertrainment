'use client';

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'framer-motion';
import React, { memo, useCallback, useRef, useState } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { useMounted, useWindowWidth } from '@/hooks/use-window.hook';
import type { Event } from '@mad/types';
import { ArrowLeft, ArrowRight } from '@mad/ui';

export interface UpcomingEventsCarouselProps {
  events: Event[];
}

export const UpcomingEventsCarousel = memo(function UpcomingEventsCarousel({
  events,
}: UpcomingEventsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();
  const mounted = useMounted();

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const enable3D = mounted && !isMobile && !prefersReducedMotion && events.length > 1;

  const nextSlide = useCallback(() => {
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const prevSlide = useCallback(() => {
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  }, [events.length]);

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

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (events.length <= 1) return;

      const threshold = 50;
      const velocityThreshold = 300;

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

  return (
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
      <span className="sr-only">
        Interactive 3D Carousel. Use Left and Right arrow keys to navigate between slides.
      </span>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence initial={false} mode="popLayout">
          {events.map((event, index) => {
            const offset = index - activeIndex;

            let absoluteOffset = offset;
            if (offset > events.length / 2) absoluteOffset -= events.length;
            if (offset < -events.length / 2) absoluteOffset += events.length;

            const isActive = absoluteOffset === 0;

            const currentWidth = mounted ? windowWidth : 1024;
            const isMobileViewport = currentWidth < 640;
            const spread = isMobileViewport ? 75 : 150;

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
});
