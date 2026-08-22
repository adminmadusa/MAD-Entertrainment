/**
 * not-found.tsx — Server Component
 *
 * C-03 FIX: This was previously 'use client', which meant:
 *   - No metadata export (404 pages had no title/description)
 *   - No static HTML for crawlers
 *   - The 150 ms setInterval ran on EVERY 404 visit regardless of interaction
 *
 * Solution: Static structure stays here (server). The interactive DJ widget is
 * a separate 'use client' child component that is only mounted when needed.
 */
import type { Metadata } from 'next';
import { ImageWrapper } from '@/components/common/ImageWrapper';
import Link from 'next/link';

import { NotFoundDJWidget } from './_components/NotFoundDJWidget';

export const metadata: Metadata = {
  title: '404 — Page Not Found | MAD Entertainments',
  description: "Looks like this page dropped off the playlist. Head back to the main stage and discover live events, DJ nights, and concerts.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* ─── Ambient Glow Blobs ────────────────────────────────── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-accent-pink/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-accent-cyan/5 rounded-full blur-[100px]" />
      </div>

      {/* ─── Grid Backdrop ────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 58, 237, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ─── Main Content ─────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8 pb-16">

        {/* Left: DJ Console illustration */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative group max-w-md w-full aspect-square rounded-3xl overflow-hidden border border-border-subtle shadow-glow-hover transition-all duration-300">
            <ImageWrapper
              src="/images/dj_turntables_404.png"
              alt="Neon DJ Equipment Lost in Sound"
              fill
              sizes="(max-width: 480px) 100vw, 448px"
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            {/* Cinematic Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" aria-hidden="true" />
          </div>
        </div>

        {/* Right: Copy + Interactive DJ Widget */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          {/* Error Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 glass border border-accent-pink/30 rounded-full text-accent-pink text-xs font-semibold uppercase tracking-widest" aria-hidden="true">
            🛑 Status 404 // Lost in the Mix
          </div>

          <h1 className="text-display-sm font-black text-white leading-tight">
            The Beat Has <span className="text-gradient">Dropped.</span>
          </h1>

          <p className="text-text-secondary text-base leading-relaxed">
            Looks like the DJ pulled the fader and you got lost in the crowd. The track you are searching for is no longer in the playlist. Let&apos;s get you back to the main stage.
          </p>

          {/* Interactive client widget — only this part loads JS */}
          <NotFoundDJWidget />

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center lg:justify-start">
            <Link
              href="/"
              className="px-6 py-3.5 bg-gradient-hero text-white text-sm font-bold rounded-xl border border-accent-purple/40 hover:border-accent-purple transition-all shadow-glow text-center"
            >
              Return to Main Stage
            </Link>
            <Link
              href="/events"
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-border-subtle text-white text-sm font-semibold rounded-xl transition-all text-center"
            >
              Browse Live Events
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
