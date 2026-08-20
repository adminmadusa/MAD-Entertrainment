'use client';

import React from 'react';

import { Skeleton } from '@mad/ui';

export function UpcomingEventsSkeleton() {
  return (
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
}
