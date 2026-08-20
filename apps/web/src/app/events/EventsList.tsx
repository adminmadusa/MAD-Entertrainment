'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { EventCard } from '@/components/common/EventCard';
import { publicGetEvents } from '@/lib/api/public.service';
import { EventGridSkeleton } from '@mad/ui';

export function EventsList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-events', page],
    queryFn: () =>
      publicGetEvents({
        page,
        limit: 12,
      }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const events = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="pb-4 sm:pb-8 space-y-8">
      {/* Event Grid */}
      {(() => {
        if (isLoading) {
          return (
            <EventGridSkeleton
              count={8}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            />
          );
        }

        if (events.length === 0) {
          return (
            <div className="text-center py-20 glass rounded-2xl border border-border-subtle">
              <div className="flex justify-center mb-4 text-accent-purple/60 animate-pulse" aria-hidden="true">
                <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-lg">No Events Found</h2>
              <p className="text-text-muted text-sm max-w-xs mx-auto mt-1">
                Active listings will appear here. Please check back later.
              </p>
            </div>
          );
        }

        return (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 transition-opacity duration-300 ${
              isFetching ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {events.map((event, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={event._id}
                className="h-full"
              >
                <EventCard event={event} variant="catalog" priority={index < 2} className="h-full" />
              </motion.div>
            ))}
          </div>
        );
      })()}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-border-subtle/50 mt-10">
          <p className="text-text-muted text-xs">
            Showing page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              aria-label="Previous page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages || isFetching}
              aria-label="Next page"
              className="px-4 py-2 text-xs glass border border-border-subtle rounded-xl disabled:opacity-40 text-text-secondary hover:text-white transition-all font-medium disabled:cursor-not-allowed cursor-pointer"
            >
              {isFetching ? 'Loading...' : 'Next →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
