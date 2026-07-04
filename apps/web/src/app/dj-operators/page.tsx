'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { publicGetDJs } from '@/lib/api/public.service';
import { SearchIcon } from '@mad/ui';

export default function DJsPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['public-djs', search, page],
    queryFn: () =>
      publicGetDJs({
        search: search.trim() || undefined,
        page,
        limit: 12,
      }),
    // PERF-018E: Keep list data fresh for 30 s so back-navigation shows
    // cached results immediately instead of re-fetching and flashing skeletons.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const djs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="container-mad space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h1 className="text-display-sm font-black text-white">Discover DJs</h1>
          <p className="text-text-secondary text-sm">
            Find and book top talent for your next event or party.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-end glass border border-border-subtle p-4 rounded-2xl">
          {/* Search Input */}
          <div className="w-full md:w-80 relative flex-shrink-0">
            <input
              type="text"
              value={search}
              aria-label="Search DJs"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search DJ Operators..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple transition-colors"
            />
            <div className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none" aria-hidden="true">
              <SearchIcon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* DJ Grid */}
        {(() => {
          if (isLoading) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="rounded-2xl border border-border-subtle overflow-hidden glass animate-pulse">
                    <div className="aspect-[4/3] bg-white/5" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-white/5 rounded w-1/2" />
                      <div className="h-4 bg-white/5 rounded w-full" />
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (djs.length === 0) {
            return (
              <div className="text-center py-20 glass rounded-2xl border border-border-subtle">
                <div className="flex justify-center mb-4 text-accent-purple/60" aria-hidden="true">
                  <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No DJs Found</h2>
                <p className="text-text-muted text-sm max-w-sm mx-auto mb-6">
                  We couldn't find any DJ Operators matching your search criteria.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-border-subtle text-text-primary text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {djs.map((dj) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={dj._id}
                >
                  <Link href={`/dj-operators/${dj.slug || dj._id}`} className="block group">
                    <div className="rounded-2xl border border-border-subtle overflow-hidden glass hover:border-accent-purple/40 transition-all duration-300 relative bg-background/50 flex flex-col h-full">
                      {/* Image */}
                      <div className="aspect-[4/3] w-full overflow-hidden relative bg-white/5 flex-shrink-0">
                        {dj.profileImage?.url ? (
                          <Image
                            src={dj.profileImage.url}
                            alt={dj.name || 'DJ Operator'}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 300px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-text-muted text-xs">No Image</span>
                          </div>
                        )}

                        {/* Active Badge */}
                        <div className="absolute top-3 right-3 z-10 flex gap-2">
                          {dj.isActive && (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-md">
                              AVAILABLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex-grow">
                          <h2 className="font-bold text-lg text-white mb-1.5 group-hover:text-accent-purple transition-colors line-clamp-1">
                            {dj.name}
                          </h2>
                          {dj.specialties && dj.specialties.length > 0 && (
                            <p className="text-xs text-text-muted mb-3 line-clamp-1">
                              {dj.specialties.join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-border-subtle text-xs">
                          <div className="text-text-secondary">
                            <span className="font-bold text-white">{dj.experienceYears || 0}</span> Years Exp.
                          </div>
                          <div className="flex items-center gap-1 text-accent-purple font-medium group-hover:translate-x-1 transition-transform">
                            View Profile
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          );
        })()}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center pt-8">
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                aria-label="Previous page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center px-4 font-semibold text-sm">
                <span className="text-white">{page}</span>
                <span className="text-text-muted mx-1.5">/</span>
                <span className="text-text-secondary">{pagination.totalPages}</span>
              </div>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                aria-label="Next page"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
