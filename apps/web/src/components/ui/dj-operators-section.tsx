'use client';

import { QUERY_KEYS } from '@mad/shared';
import { DJOperator } from '@mad/types';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { publicGetDJs } from '@/lib/api/public.service';

// ─── DJ Card ──────────────────────────────────────────────────

function DJCard({ dj }: { dj: DJOperator }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group glass rounded-2xl border border-border-subtle hover:border-accent-purple/40 hover:shadow-glow-sm transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Avatar / Profile image */}
      <div className="relative aspect-square w-full overflow-hidden bg-white/5">
        {dj.profileImage?.url ? (
          <Image
            src={dj.profileImage.url}
            alt={dj.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-accent-purple/20 to-accent-pink/10">
            🎧
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-accent-purple-light transition-colors">
          {dj.name}
        </h3>

        {dj.specialties && dj.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {dj.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light uppercase tracking-wider"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {dj.bio && (
          <p className="text-text-muted text-xs line-clamp-2 mt-1 leading-relaxed">
            {dj.bio}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── DJ Skeleton ──────────────────────────────────────────────

function DJSkeleton() {
  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden animate-pulse">
      <div className="aspect-square w-full bg-white/5" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-white/8 rounded-lg w-2/3" />
        <div className="h-3 bg-white/5 rounded-lg w-1/2" />
      </div>
    </div>
  );
}

// ─── DJ Operators Section ─────────────────────────────────────

export function DJOperatorsSection() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.public.djs.list(),
    queryFn: () => publicGetDJs({ limit: 6 }),
    staleTime: 1000 * 60 * 10,
  });

  const djs = data?.data ?? [];

  // Don't render the section if no DJs and not loading
  if (!isLoading && djs.length === 0) return null;

  return (
    <section className="py-20" aria-label="DJ Operators">
      <div className="container-mad">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-accent-pink text-sm font-semibold uppercase tracking-wider mb-3">
            Our Artists
          </p>
          <h2 className="text-display-sm font-black text-white mb-4">
            MAD <span className="text-gradient-cyan">DJ Operators</span>
          </h2>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            The names behind the nights. From underground bass to mainstream bangers — curated by MAD Entertrainment.
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <DJSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {djs.map((dj) => (
              <DJCard key={dj._id} dj={dj} />
            ))}
          </div>
        )}

        {/* CTA */}
        {!isLoading && data?.pagination && data.pagination.total > 6 && (
          <div className="text-center mt-10">
            <Link href="/events?category=dj_night">
              <button
                id="dj-operators-view-all"
                className="px-7 py-3.5 glass border border-accent-purple/30 text-accent-purple-light font-semibold rounded-xl hover:border-accent-purple/60 hover:bg-accent-purple/10 transition-all"
              >
                View All DJ Events →
              </button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
