import React from 'react';

/**
 * FeaturedEventsSkeleton
 * Mimics the 3D cover flow carousel layout to prevent layout shift.
 * Shows a main active card in the center and two flanked inactive cards on larger viewports.
 */
export function FeaturedEventsSkeleton() {
  return (
    <section
      className="py-16 overflow-hidden"
      aria-hidden="true"
    >
      <div className="container-mad">
        {/* Header Shimmer */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="w-28 h-4 bg-white/10 rounded animate-pulse mb-2" />
            <div className="w-48 h-8 bg-white/15 rounded animate-pulse" />
          </div>
          <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
        </div>

        {/* Carousel Visual Skeleton */}
        <div className="relative w-full max-w-6xl mx-auto h-[450px] sm:h-[500px] mt-8 flex items-center justify-center">
          {/* Left Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[280px] h-[380px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform -translate-x-48 scale-85 pointer-events-none">
            <div className="aspect-[4/3] w-full bg-white/5" />
            <div className="p-4 flex-grow space-y-3">
              <div className="w-20 h-3 bg-white/5 rounded" />
              <div className="w-32 h-4 bg-white/10 rounded" />
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-white/5 rounded" />
                <div className="w-3/4 h-2 bg-white/5 rounded" />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20">
              <div className="w-12 h-3 bg-white/5 rounded" />
              <div className="w-16 h-7 bg-white/10 rounded-lg" />
            </div>
          </div>

          {/* Center Main Card */}
          <div className="flex flex-col w-[260px] sm:w-[320px] h-[380px] sm:h-[450px] bg-white/3 border border-white/10 rounded-2xl overflow-hidden shadow-glow-sm z-10">
            {/* Banner Shimmer */}
            <div className="aspect-[4/3] w-full bg-white/5 animate-pulse relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute top-3 left-3 w-16 h-5 bg-white/10 rounded-full" />
            </div>

            {/* Details Shimmer */}
            <div className="p-4 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                {/* Date */}
                <div className="w-24 h-3 bg-white/10 rounded animate-pulse flex items-center gap-1.5" />
                {/* Title */}
                <div className="w-48 h-5 bg-white/15 rounded animate-pulse" />
                {/* Description */}
                <div className="space-y-2">
                  <div className="w-full h-3 bg-white/5 rounded animate-pulse" />
                  <div className="w-5/6 h-3 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* CTA Shimmer */}
            <div className="px-4 pb-4 pt-3 border-t border-white/5 flex justify-between items-center bg-black/40">
              <div className="space-y-1">
                <div className="w-14 h-2 bg-white/5 rounded" />
                <div className="w-16 h-4 bg-white/10 rounded" />
              </div>
              <div className="w-24 h-8 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Right Flank Card (Visible only on desktop/tablet) */}
          <div className="hidden md:flex flex-col w-[280px] h-[380px] bg-white/2 border border-white/5 rounded-2xl overflow-hidden opacity-30 transform translate-x-48 scale-85 pointer-events-none">
            <div className="aspect-[4/3] w-full bg-white/5" />
            <div className="p-4 flex-grow space-y-3">
              <div className="w-20 h-3 bg-white/5 rounded" />
              <div className="w-32 h-4 bg-white/10 rounded" />
              <div className="space-y-1.5">
                <div className="w-full h-2 bg-white/5 rounded" />
                <div className="w-3/4 h-2 bg-white/5 rounded" />
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/20">
              <div className="w-12 h-3 bg-white/5 rounded" />
              <div className="w-16 h-7 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
