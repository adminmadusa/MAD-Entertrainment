'use client';

import { memo } from 'react';
import { DJOperator } from '@mad/types';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { getOptimizedImageUrl } from '@/utils/image';

// ─── DJ Card ──────────────────────────────────────────────────

const DJCard = memo(function DJCard({ dj }: { dj: DJOperator }) {
  return (
    <Link href={`/dj-operators/${dj.slug || dj._id}`} className="block h-full w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group glass neon-glow-border card-interactive rounded-2xl overflow-hidden flex flex-col h-full relative"
      >
        {/* Hover Gradient Glow Backdrop */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary via-accent to-cyan opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-sm pointer-events-none z-0" />

        {/* Avatar / Profile image */}
        <div className="relative aspect-square w-full overflow-hidden bg-white/5 image-overlay-vignette z-10">
          {dj.profileImage?.url ? (
            <Image
              src={getOptimizedImageUrl(dj.profileImage.url, 300)}
              alt={dj.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/20 to-accent/10">
              🎧
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-1 flex-1 relative z-10">
          <h3 className="text-white font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {dj.name}
          </h3>

          {dj.specialties && dj.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {dj.specialties.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider"
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
    </Link>
  );
});

// ─── DJ Operators Section ─────────────────────────────────────

export const DJOperatorsSection = memo(function DJOperatorsSection({ initialDJs = [] }: { initialDJs: DJOperator[] }) {
  const djs = initialDJs;

  // Don't render the section if no DJs
  if (djs.length === 0) return null;

  return (
    <section className="py-12 md:py-16" aria-label="DJ Operators">
      <div className="container-mad">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-accent-pink text-sm font-semibold uppercase tracking-wider mb-3">
            Our Artists
          </p>
          <h2 className="text-display-sm font-black text-white mb-4 text-glow-neon-cyan">
            MAD <span className="text-gradient-cyan">DJ Operators</span>
          </h2>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            The names behind the nights. From underground bass to mainstream bangers — curated by MAD Entertrainment.
          </p>
        </div>

        {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {djs.map((dj) => (
              <DJCard key={dj._id} dj={dj} />
            ))}
          </div>

        {/* CTA */}
        {djs.length >= 5 && (
          <div className="text-center mt-10">
            <Link href="/dj-operators">
              <button
                id="dj-operators-view-all"
                className="px-8 py-4 glass border border-accent-purple/30 text-accent-purple-light hover:text-white font-bold rounded-2xl hover:border-accent-purple/60 hover:bg-accent-purple/20 hover:shadow-glow transition-all duration-300"
              >
                View All DJs →
              </button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
});
