'use client';

import Link from 'next/link';
import { memo } from 'react';
import { motion } from 'framer-motion';

import { ImageWrapper } from '@/components/common/ImageWrapper';
import { Reveal } from '@/components/common/PageTransition';
import { formatEventDate } from '@/utils/date';
import { getOptimizedImageUrl } from '@/utils/image';
import { EventCategory, EVENT_CATEGORY_LABELS } from '@mad/shared';
import type { Event } from '@mad/types';
import { CalendarIcon, Camera, Images } from '@mad/ui';

interface CompletedEventsSectionProps {
  initialEvents: Event[];
}

export const CompletedEventsSection = memo(function CompletedEventsSection({
  initialEvents = [],
}: CompletedEventsSectionProps) {
  if (initialEvents.length === 0) {
    return null;
  }

  return (
    <section className="py-16 overflow-hidden bg-background/20" aria-label="Past events gallery" role="region">
      <div className="container-mad">
        <Reveal>
          <div className="mb-10">
            <p className="text-accent-pink-light text-sm font-semibold uppercase tracking-wider mb-2">
              Relive the Magic
            </p>
            <h2 className="text-display-sm font-black text-white">
              Past Events &amp; Moments
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialEvents.map((event, index) => {
            const photoCount = event.gallery?.itemCount ?? 0;

            return (
              <Reveal key={event._id} delay={index * 100}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="group relative glass rounded-2xl border border-border-subtle overflow-hidden hover:border-accent-pink/40 hover:shadow-glow-pink-sm transition-all duration-300 flex flex-col h-[400px] sm:h-[450px]"
                >
                  <Link
                    href={`/events/${event.slug}/gallery`}
                    id={`completed-event-card-${event.slug}`}
                    className="flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink"
                    aria-label={`View Happy Moments gallery for ${event.title}`}
                  >
                    {/* Banner Image */}
                    <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                      {event.bannerImage?.url ? (
                        <ImageWrapper
                          src={getOptimizedImageUrl(event.bannerImage.url, 600)}
                          alt={`Event poster for ${event.title}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                          className="object-cover group-hover:scale-105 transition-all duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-accent-pink" aria-hidden="true">
                        <Camera className="w-16 h-16 opacity-40" />
                        </div>
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/40 group-hover:via-black/10 transition-all duration-300" />

                      {/* Ended badge */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-text-muted rounded-full border border-white/10 flex items-center gap-1">
                        <Camera className="w-3 h-3" aria-hidden="true" />
                        Ended
                      </span>

                      {/* Category Badge */}
                      <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-accent-pink rounded-full border border-accent-pink/20">
                        {EVENT_CATEGORY_LABELS[event.category as EventCategory] || event.category}
                      </span>

                      {/* Photo Count Badge */}
                      {photoCount > 0 && (
                        <span className="absolute bottom-3 right-3 px-2.5 py-1 text-[10px] font-bold bg-accent-pink/90 backdrop-blur-md text-white rounded-full flex items-center gap-1">
                          <Images className="w-3 h-3" aria-hidden="true" />
                          {photoCount} Photos
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 sm:p-5 flex flex-col flex-grow bg-black/10">
                      <div className="text-text-secondary text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-accent-pink-light" />
                        {formatEventDate(event.startDate)}
                      </div>
                      <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 mb-2 group-hover:text-accent-pink-light transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-text-secondary text-[11px] sm:text-xs line-clamp-2 leading-relaxed flex-grow">
                        {event.description}
                      </p>
                    </div>

                    {/* Action Panel */}
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-border-subtle/30 flex items-center justify-between mt-auto bg-black/35 w-full">
                      <span className="text-[10px] sm:text-xs font-semibold text-accent-pink-light italic">
                        Happy Moments
                      </span>
                      <div className="px-3.5 py-2 text-[10px] sm:text-xs font-bold text-accent-pink bg-accent-pink/10 border border-accent-pink/30 rounded-xl text-center group-hover:bg-accent-pink/20 transition-colors">
                        View Gallery →
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
});
