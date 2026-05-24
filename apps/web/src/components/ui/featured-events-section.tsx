'use client';

import { useState } from 'react';
import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import { EventGridSkeleton } from '@mad/ui';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/common/page-transition';
import { publicGetEvents } from '@/lib/api/public.service';

function ArrowRight({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeft({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function FeaturedEventsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-events'],
    // Fetching 6 items so the cover flow looks populated
    queryFn: () => publicGetEvents({ page: 1, limit: 6 }),
  });

  const events = data?.data ?? [];
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % events.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <section className="py-16 overflow-hidden" aria-label="Featured events">
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

        {isLoading ? (
          <EventGridSkeleton count={4} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
        ) : events.length === 0 ? (
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
          <div className="relative w-full max-w-6xl mx-auto h-[450px] sm:h-[500px] mt-8" style={{ perspective: '1200px' }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence initial={false} mode="popLayout">
                {events.map((event, index) => {
                  const offset = index - activeIndex;
                  
                  // Wrap logic for infinite carousel feel
                  let absoluteOffset = offset;
                  if (offset > events.length / 2) absoluteOffset -= events.length;
                  if (offset < -events.length / 2) absoluteOffset += events.length;
                  
                  const isActive = absoluteOffset === 0;
                  
                  // Responsiveness adjustments
                  const spread = typeof window !== 'undefined' && window.innerWidth < 640 ? 100 : 160;
                  
                  // Cover flow 3D math
                  const x = absoluteOffset * spread;
                  const z = isActive ? 0 : -150 - Math.abs(absoluteOffset) * 60;
                  const rotateY = isActive ? 0 : absoluteOffset > 0 ? -25 : 25;
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
                        z,
                        rotateY,
                        opacity,
                        scale: isActive ? 1 : 0.85,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        mass: 1,
                      }}
                      style={{
                        zIndex,
                        position: "absolute",
                        transformStyle: "preserve-3d"
                      }}
                      className={`pointer-events-auto w-[260px] sm:w-[320px] h-[380px] sm:h-[450px] group glass rounded-2xl border ${isActive ? 'border-accent-purple/50 shadow-glow' : 'border-border-subtle cursor-pointer'} overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-accent-purple focus-within:border-accent-purple/40`}
                      onClick={() => !isActive && setActiveIndex(index)}
                    >
                      {/* Wrap the image, date, title, and description in a link */}
                      <Link
                        href={`/events/${event.slug}`}
                        className={`flex flex-col flex-grow focus:outline-none ${!isActive ? 'pointer-events-none' : ''}`}
                        aria-label={`View details for ${event.title}`}
                        tabIndex={isActive ? 0 : -1}
                      >
                        {/* Banner Image */}
                        <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                          {event.bannerImage?.url ? (
                            <Image
                              src={event.bannerImage.url}
                              alt=""
                              fill
                              priority={isActive}
                              sizes="(max-width: 768px) 100vw, 320px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl">
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
                        <div className="p-4 flex flex-col flex-grow bg-black/20 backdrop-blur-sm">
                          <div className="text-text-muted text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-accent-purple-light" />
                            {formatDate(event.startDate)}
                          </div>
                          <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 mb-2 group-hover:text-accent-purple-light transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-text-secondary text-[11px] sm:text-xs line-clamp-2 mb-4 flex-grow leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </Link>

                      <div className={`px-4 pb-4 pt-3 border-t border-border-subtle/40 flex items-center justify-between mt-auto bg-black/40 backdrop-blur-md transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
                        <div>
                          <div className="text-[9px] sm:text-[10px] text-text-muted font-medium">Tickets from</div>
                          <div className="text-white font-black text-xs sm:text-sm">
                            ₹{Math.min(...event.ticketTiers.map((t) => t.price))}
                          </div>
                        </div>
                        <Link href={`/events/${event.slug}`} id={`event-card-book-${event.slug}`} tabIndex={-1} className={!isActive ? 'pointer-events-none' : ''}>
                          <button
                            tabIndex={-1}
                            disabled={!isActive}
                            className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm group-hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {event.isSoldOut ? 'Details' : 'Book Now'}
                          </button>
                        </Link>
                      </div>
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
                  className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple shadow-lg"
                  aria-label="Previous event"
                >
                  <ArrowLeft size={20} />
                </button>
                <button 
                  onClick={nextSlide}
                  className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full glass border border-border-subtle text-white hover:text-accent-purple hover:border-accent-purple/50 transition-all focus:outline-none focus:ring-2 focus:ring-accent-purple shadow-lg"
                  aria-label="Next event"
                >
                  <ArrowRight size={20} />
                </button>

                {/* Dots indicator */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                  {events.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
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
}
