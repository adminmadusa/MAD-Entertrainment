import { ScrollIndicator } from '@mad/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { Reveal, StaggerContainer, StaggerItem } from '@/components/common/PageTransition';
import { DJOperatorsSection } from '@/components/ui/DjOperatorsSection';
import { FeaturedEventsSection } from '@/components/ui/FeaturedEventsSection';
import { MarqueeBanner } from '@/components/ui/MarqueeBanner';
import {
  FeaturedEventsSkeleton,
  DJOperatorsSkeleton,
  MarqueeBannerSkeleton,
} from '@/components/ui/HomeSkeletons';
import { serverGetFeaturedEvents, serverGetDJs, serverGetCategories } from '@/lib/api/server.service';

export const metadata: Metadata = {
  title: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
  description:
    'Discover and book tickets for the hottest shows, events, DJ nights, concerts, festivals, comedy, and VIP events near you.',
};

// ─── Parallel Server Data Loaders ─────────────────────────────────

async function FeaturedEventsServerSection() {
  const events = await serverGetFeaturedEvents();
  return <FeaturedEventsSection initialEvents={events} />;
}

async function DJOperatorsServerSection() {
  const djs = await serverGetDJs();
  return <DJOperatorsSection initialDJs={djs} />;
}

async function MarqueeBannerServerSection() {
  const categories = await serverGetCategories();
  return <MarqueeBanner initialCategories={categories} />;
}

// ─── Main HomePage Component (Instant TTFB / Streaming) ───────────

export default function HomePage() {
  return (
    <>
      {/* ─── Hero Section ─────────────────────────────────── */}
      <HeroSection />

      {/* ─── Featured Events (Streamed) ────────────────────── */}
      <Suspense fallback={<FeaturedEventsSkeleton />}>
        <FeaturedEventsServerSection />
      </Suspense>

      {/* ─── DJ Operators (Streamed) ───────────────────────── */}
      <Suspense fallback={<DJOperatorsSkeleton />}>
        <DJOperatorsServerSection />
      </Suspense>

      {/* ─── Marquee Banner (Streamed) ─────────────────────── */}
      <Suspense fallback={<MarqueeBannerSkeleton />}>
        <MarqueeBannerServerSection />
      </Suspense>

      {/* ─── How It Works ─────────────────────────────────── */}
      <HowItWorksSection />

      {/* ─── CTA Section ──────────────────────────────────── */}
      <CTASection />
    </>
  );
}

// ─── Hero Section ─────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-pink/10 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent-cyan/8 rounded-full blur-[80px]" />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="container-mad relative z-10 text-center pt-24 pb-16">

        {/* Headline */}
        <Reveal delay={0.2}>
          <h1 className="text-display-xl font-black text-white mb-6 leading-[1.02] text-glow-neon">
            Experience the{' '}
            <span className="text-gradient block">Extraordinary</span>
          </h1>
        </Reveal>

        {/* Subheadline */}
        <Reveal delay={0.3}>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Book tickets for DJ nights, concerts, comedy shows, festivals, VIP events and unforgettable live experiences — all in one place.
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal delay={0.4}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events">
              <button
                id="hero-book-now"
                className="px-8 py-4 btn-gradient text-white font-bold text-lg rounded-2xl shadow-glow inline-flex items-center gap-2 group"
              >
                Browse Events
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/my-booking">
              <button
                id="hero-my-booking"
                className="px-8 py-4 glass border border-border-subtle hover:border-accent-purple/50 text-text-primary hover:text-white hover:bg-accent-purple/10 font-semibold text-lg rounded-2xl transition-all duration-300 hover:shadow-glow-sm"
              >
                My Booking
              </button>
            </Link>
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal delay={0.5}>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { value: '500+', label: 'Events' },
              { value: '50K+', label: 'Tickets Sold' },
              { value: '100+', label: 'Artists' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-gradient">{stat.value}</div>
                <div className="text-text-muted text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Scroll Indicator */}
      <ScrollIndicator />
    </section>
  );
}

// MarqueeBanner is imported dynamically from '@/components/ui/MarqueeBanner'



// ─── How It Works ─────────────────────────────────────────────

const steps = [
  {
    step: '01',
    title: 'Browse Events',
    description: 'Discover upcoming events, DJ nights, concerts, and shows near you.',
    icon: '🔍',
  },
  {
    step: '02',
    title: 'Select Tickets',
    description: 'Choose your seats or ticket tier — General, Gold, VIP, or Platinum.',
    icon: '🎟️',
  },
  {
    step: '03',
    title: 'Secure Payment',
    description: 'Pay securely via UPI, cards, or wallets with Razorpay or Stripe.',
    icon: '💳',
  },
  {
    step: '04',
    title: 'Get QR Ticket',
    description: 'Receive your encrypted QR ticket instantly via email and SMS.',
    icon: '📱',
  },
];

function HowItWorksSection() {
  return (
    <section className="py-20 bg-background-secondary/30 overflow-hidden" aria-label="How booking works">
      <div className="container-mad">
        <Reveal className="text-center mb-14">
          <h2 className="text-display-sm font-black text-white text-glow-neon">
            How It Works
          </h2>
        </Reveal>

        <StaggerContainer
          className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6 w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple rounded-2xl"
        >
          {steps.map((step, i) => (
            <StaggerItem
              key={step.step}
              className="flex flex-col"
            >
              <div className="glass rounded-2xl p-2.5 xs:p-4 sm:p-6 border border-border-subtle relative group hover:border-accent-purple/30 transition-all duration-300 flex-1 flex flex-col justify-between min-h-[140px] xs:min-h-[170px] sm:min-h-[200px]">
                <div>
                  <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-10 sm:h-10 bg-gradient-brand rounded-lg sm:rounded-xl flex items-center justify-center text-white text-[9px] sm:text-xs font-black shadow-glow-sm">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-2xl sm:text-4xl mb-2 sm:mb-4 animate-float" aria-hidden="true">{step.icon}</div>
                  <h3 className="text-white font-bold text-xs sm:text-lg mb-1 sm:mb-2">{step.title}</h3>
                  <p className="hidden sm:block text-text-secondary sm:text-sm leading-snug sm:leading-relaxed">{step.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24" aria-label="Call to action">
      <div className="container-mad">
        <Reveal>
          <div className="relative glass rounded-3xl border border-accent-purple/20 p-12 md:p-20 text-center overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-accent-purple/20 blur-[80px] rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-accent-pink/15 blur-[60px] rounded-full" />

            <div className="relative z-10">
              <h2 className="text-display-md font-black text-white mb-5 text-glow-neon">
                Ready for an{' '}
                <span className="text-gradient">Unforgettable</span>{' '}
                Night?
              </h2>
              <p className="text-text-secondary text-lg mb-10 max-w-lg mx-auto">
                Join thousands of event-goers booking their next great experience on MAD Entertrainment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/events">
                  <button id="cta-browse-events" className="px-10 py-4 btn-gradient text-white font-bold text-lg rounded-2xl shadow-glow inline-flex items-center gap-2 group">
                    Browse All Events
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/my-booking">
                  <button id="cta-my-booking" className="px-10 py-4 glass border border-border-subtle hover:border-accent-purple/50 text-text-primary hover:text-white hover:bg-accent-purple/10 font-semibold text-lg rounded-2xl transition-all duration-300 hover:shadow-glow-sm">
                    Track My Booking
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Icons ────────────────────────────────────────────────────

function ArrowRight({ className = '', size = 16 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
