import { ScrollIndicator, ArrowRight } from '@mad/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { Reveal, StaggerContainer, StaggerItem } from '@/components/common/PageTransition';
import { DJOperatorsSection } from '@/components/ui/DjOperatorsSection';
const FeaturedEventsSection = dynamic(() => import('@/components/ui/FeaturedEventsSection').then(mod => mod.FeaturedEventsSection), {
  ssr: true,
});
import {
  FeaturedEventsSkeleton,
  DJOperatorsSkeleton,
} from '@/components/ui/HomeSkeletons';
import { serverGetFeaturedEvents, serverGetDJs } from '@/lib/api/server.service';

export const metadata: Metadata = {
  title: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
  description:
    'Discover and book tickets for the hottest shows, events, DJ nights, concerts, festivals, comedy, and VIP events near you.',
  alternates: {
    canonical: 'https://madentertainment.in',
  },
  openGraph: {
    url: 'https://madentertainment.in',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MAD Entertrainment — Premium Ticket Booking',
      },
    ],
  },
};

// ISR: revalidate every 60 s so featured events stay fresh without per-request SSR
export const revalidate = 60;

// ─── Parallel Server Data Loaders ─────────────────────────────────

async function FeaturedEventsServerSection() {
  const events = await serverGetFeaturedEvents();
  return <FeaturedEventsSection initialEvents={events} />;
}

async function DJOperatorsServerSection() {
  const djs = await serverGetDJs();
  return <DJOperatorsSection initialDJs={djs} />;
}



// ─── Main HomePage Component (Instant TTFB / Streaming) ───────────

export default function HomePage() {
  const homepageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'MAD Entertrainment — Book Shows, Events & DJ Nights',
    description:
      'Book tickets for the hottest shows, events, DJ nights, concerts, comedy shows, and live performances.',
    url: 'https://madentertainment.in',
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />
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
      className="relative min-h-[85vh] min-h-[85svh] md:min-h-[88vh] md:min-h-[88dvh] lg:min-h-[90vh] lg:min-h-[90dvh] flex items-center justify-center overflow-hidden"
      aria-label="Hero section"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[60px] md:blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-pink/10 rounded-full blur-[50px] md:blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent-cyan/8 rounded-full blur-[40px] md:blur-[80px]" />
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
      <div className="container-mad relative z-10 text-center pt-24 pb-12">

        {/* Headline */}
        <h1 className="text-display-xl font-black text-white mb-6 leading-[1.02] text-glow-neon animate-hero-fade-in animation-delay-200">
          Experience the{' '}
          <span className="text-gradient block">Extraordinary</span>
        </h1>

        {/* Subheadline */}
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed animate-hero-fade-in animation-delay-300">
          Book tickets for DJ nights, concerts, comedy shows, festivals, VIP events and unforgettable live experiences — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-hero-fade-in animation-delay-350">
          <Link
            id="hero-book-now"
            href="/events"
            className="px-8 py-4 btn-gradient text-white font-bold text-lg rounded-2xl shadow-glow inline-flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse Events
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            id="hero-my-booking"
            href="/tickets"
            className="px-8 py-4 glass border border-border-subtle hover:border-accent-purple/50 text-text-primary hover:text-white hover:bg-accent-purple/10 font-semibold text-lg rounded-2xl transition-all duration-300 hover:shadow-glow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            My Tickets
          </Link>
        </div>

        {/* Quick Link Category Pills */}
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto mb-10 px-4 animate-hero-fade-in animation-delay-400" role="navigation" aria-label="Quick category filters">
          {[
            { label: 'DJ Nights', value: 'dj_night' },
            { label: 'Concerts', value: 'concert' },
            { label: 'Festivals', value: 'festival' },
            { label: 'Comedy', value: 'comedy' },
            { label: 'VIP Events', value: 'vip_event' },
          ].map((cat) => (
            <Link
              key={cat.value}
              href={`/events?category=${cat.value}`}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-text-muted hover:border-accent-purple/40 hover:text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-6 max-w-xl mx-auto animate-hero-fade-in animation-delay-450">
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
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Scroll Indicator */}
      <ScrollIndicator />
    </section>
  );
}



// ─── How It Works ─────────────────────────────────────────────

const steps = [
  {
    step: '01',
    title: 'Browse Events',
    description: 'Discover upcoming events, DJ nights, concerts, and shows near you.',
    icon: (
      <svg className="w-8 h-8 text-accent-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Select Tickets',
    description: 'Choose your seats or ticket tier — General, Gold, VIP, or Platinum.',
    icon: (
      <svg className="w-8 h-8 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 110 4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Secure Payment',
    description: 'Pay securely via UPI, cards, or wallets with Razorpay or Stripe.',
    icon: (
      <svg className="w-8 h-8 text-accent-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'Get QR Ticket',
    description: 'Receive your encrypted QR ticket instantly via email and SMS.',
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
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
                  <div className="text-2xl sm:text-4xl mb-2 sm:mb-4 animate-float text-text-primary" aria-hidden="true">
                    {step.icon}
                  </div>
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
    <section className="pt-24 pb-32 md:pb-24" aria-label="Call to action">
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
                <Link
                  id="cta-browse-events"
                  href="/events"
                  className="px-10 py-4 btn-gradient text-white font-bold text-lg rounded-2xl shadow-glow inline-flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Browse All Events
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  id="cta-my-booking"
                  href="/tickets"
                  className="px-10 py-4 glass border border-border-subtle hover:border-accent-purple/50 text-text-primary hover:text-white hover:bg-accent-purple/10 font-semibold text-lg rounded-2xl transition-all duration-300 hover:shadow-glow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  My Tickets
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

