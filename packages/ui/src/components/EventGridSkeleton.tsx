import React from 'react';

export function EventGridSkeleton({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/10" />
      ))}
    </div>
  );
}
