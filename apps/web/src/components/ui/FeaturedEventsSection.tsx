'use client';

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useRef, useState } from 'react';

import { Reveal } from '@/components/common/PageTransition';
import { useMounted, useWindowWidth } from '@/hooks/use-window.hook';
import { formatEventDate } from '@/utils/date';
import { getOptimizedImageUrl } from '@/utils/image';
import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import type { Event } from '@mad/types';
import { ArrowLeft, ArrowRight, CalendarIcon } from '@mad/ui';

export const FeaturedEventsSection = memo(function FeaturedEventsSection({ initialEvents = [] }: { initialEvents: Event[] }) {
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
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      e.preventDefault();
    }
  }, [nextSlide, prevSlide]);

  // Mobile Drag / Swipe handling using Framer Motion gesture metadata
  const handleDragEnd = useCallback((event: unknown, info: PanInfo) => {
    const threshold = 50; // swipe threshold in pixels
    if (info.offset.x < -threshold) {
      nextSlide();
    } else if (info.offset.x > threshold) {
      prevSlide();
    }
  }, [nextSlide, prevSlide]);


  return (
    <section
      className="pt-8 pb-16 overflow-hidden"
      aria-label="Featured events"
      role="region"
    >
      <div className="container-mad">


        <Reveal>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-accent-purple text-sm font-semibold uppercase tracking-wider mb-2">
                Don&apos;t Miss Out
              </p>
              <h2 className="text-display-sm font-black text-white">
                Featured Events
              </h2>
            </div>
            <Link
              href="/events"
              id="view-all-events"
              className="text-text-secondary hover:text-accent-purple-light text-sm font-medium transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </Reveal>

        {events.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-border-subtle">
            <div className="flex justify-center mb-4 text-accent-purple/60 animate-pulse" aria-hidden="true">
              <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg">No Active Events</h3>
            <p className="text-text-muted text-sm max-w-xs mx-auto mt-1">
              Check back soon for upcoming shows, DJ nights, and entertainment experiences!
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-6xl mx-auto h-[450px] sm:h-[500px] mt-8 focus:outline-none"
            style={{ perspective: '1200px' }}
            role="group"
            aria-roledescription="carousel"
            aria-label="Upcoming featured events"
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
                  const isMobile = currentWidth < 640;
                  const spread = isMobile ? 100 : 160;

                  // Cover flow 3D math
                  const x = absoluteOffset * spread;
                  const z = isActive || isMobile ? 0 : -150 - Math.abs(absoluteOffset) * 60;
                  let rotateY = 0;
                  if (!isActive && !isMobile) {
                    rotateY = absoluteOffset > 0 ? -25 : 25;
                  }
                  const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(absoluteOffset) * 0.4);
                  const zIndex = 20 - Math.abs(absoluteOffset);

                  // Don't render cards that are too far away
                  if (Math.abs(absoluteOffset) > 2) return null;

                  return (
                    <motion.div
                      key={event._id}
                      initial={false}
                      animate={{
                        x,
                        z: enable3D ? z : 0,
                        rotateY: enable3D ? rotateY : 0,
                        opacity,
                        scale: isActive ? 1 : 0.85,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        mass: 1,
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragEnd={handleDragEnd}
                      style={{
                        zIndex,
                        position: "absolute",
                        transformStyle: enable3D ? "preserve-3d" : "flat"
                      }}
                      className={`pointer-events-auto w-[260px] sm:w-[320px] h-[380px] sm:h-[450px] group glass rounded-2xl border ${isActive ? 'border-accent-purple/50 shadow-glow' : 'border-border-subtle cursor-pointer'} overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-accent-purple focus-within:border-accent-purple/40`}
                      onClick={() => !isActive && setActiveIndex(index)}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${events.length}: ${event.title}`}
                      aria-hidden={!isActive}
                    >
                      <Link
                        href={`/events/${event.slug}`}
                        id={`featured-event-card-${event.slug}`}
                        className={`flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${!isActive ? 'pointer-events-none' : ''}`}
                        aria-label={event.isSoldOut ? `View details for ${event.title}` : `Book tickets for ${event.title}`}
                        tabIndex={isActive ? 0 : -1}
                      >
                        {/* Banner Image */}
                        <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                          {event.bannerImage?.url ? (
                            <Image
                              src={getOptimizedImageUrl(event.bannerImage.url, 600)}
                              alt={`Promotional poster for ${event.title}`}
                              fill
                              priority={index === 0}
                              sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, 320px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl" aria-hidden="true">
                              🎧
                            </div>
                          )}

                          {/* Dark overlay for inactive slides to make the center pop */}
                          {!isActive && <div className="absolute inset-0 bg-black/40 transition-opacity" />}

                          {/* Category Badge */}
                          <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-accent-purple-light rounded-full border border-accent-purple/20">
                            {EVENT_CATEGORY_LABELS[event.category as EventCategory] || event.category}
                          </span>

                          {event.isSoldOut && (
                            <span className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-sm tracking-wider">
                              SOLD OUT
                            </span>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex flex-col flex-grow bg-black/20">
                          <div className="text-text-muted text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-accent-purple-light" />
                            {formatEventDate(event.startDate)}
                          </div>
                          <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-text-secondary text-[11px] sm:text-xs line-clamp-2 mb-4 flex-grow leading-relaxed">
                            {event.description}
                          </p>
                        </div>

                        <div className={`px-4 pb-4 pt-3 border-t border-border-subtle/40 flex items-center justify-between mt-auto bg-black/40 transition-opacity w-full ${!isActive ? 'opacity-50' : ''}`}>
                          <div>
                            <div className="text-[9px] sm:text-[10px] text-text-muted font-medium">Tickets from</div>
                             <div className="text-white font-black text-xs sm:text-sm">
                              ₹{event.ticketTiers && event.ticketTiers.length > 0 ? Math.min(...event.ticketTiers.map((t) => t.price)) : 0}
                            </div>
                          </div>
                          <div
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm group-hover:scale-105 transition-all text-center inline-block"
                          >
                            {event.isSoldOut ? 'Details' : 'Book Now'}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            {events.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg"
                  aria-label="Previous event"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg"
                  aria-label="Next event"
                >
                  <ArrowRight size={20} />
                </button>

                {/* Dots indicator */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30" role="tablist" aria-label="Carousel slide triggers">
                  {events.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      role="tab"
                      aria-selected={idx === activeIndex}
                      className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        idx === activeIndex
                          ? 'bg-accent-purple w-6 shadow-glow-sm'
                          : 'bg-border-subtle hover:bg-accent-purple/50'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
});
