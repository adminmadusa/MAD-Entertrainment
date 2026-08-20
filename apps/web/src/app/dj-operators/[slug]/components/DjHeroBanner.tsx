'use client';

import Link from 'next/link';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import type { DJOperator } from '@mad/types';

interface DjHeroBannerProps {
  dj: DJOperator;
}

export function DjHeroBanner({ dj }: DjHeroBannerProps) {
  return (
    <section className="relative w-full min-h-[320px] md:min-h-[420px] py-10 md:py-16 flex items-center overflow-hidden bg-bg-card/20 border-b border-border-subtle/30">
      {dj.profileImage?.url ? (
        <div className="absolute inset-0 z-0">
          <ImageWrapper
            src={dj.profileImage.url}
            alt={dj.name}
            fill
            sizes="100vw"
            className="object-cover opacity-20 scale-105 blur-[6px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/90" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-background-secondary to-background z-0" />
      )}

      <div className="container-mad w-full relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-end">
          {/* Profile Image Card */}
          <div className="relative w-36 sm:w-48 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-white/5 image-overlay-vignette group flex-shrink-0">
            {dj.profileImage?.url ? (
              <ImageWrapper
                src={dj.profileImage.url}
                alt={dj.name}
                fill
                sizes="(max-width: 640px) 144px, (max-width: 1024px) 192px, 256px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-accent-purple text-5xl">
                🎧
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {dj.isActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shadow-glow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  AVAILABLE
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight text-glow-neon">
                {dj.name}
              </h1>
            </div>

            {dj.specialties && dj.specialties.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                {dj.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light uppercase tracking-wider"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {dj.bio && (
              <p className="text-text-secondary text-sm leading-relaxed max-w-2xl text-center md:text-left line-clamp-4 font-medium pt-1">
                {dj.bio}
              </p>
            )}

            <div className="hidden md:flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <Link
                href="/events"
                className="px-5 py-2.5 text-xs font-bold text-white btn-gradient rounded-xl shadow-glow-sm hover:scale-105 active:scale-100 transition-transform block text-center"
              >
                Book Tickets
              </Link>
              <a
                href={`mailto:bookings@madentertainment.in?subject=Booking Inquiry: ${dj.name}`}
                className="px-5 py-2.5 text-xs font-semibold text-text-primary glass border border-border-subtle hover:border-accent-purple/40 hover:bg-accent-purple/5 rounded-xl transition-all block text-center"
              >
                Send Inquiry
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
