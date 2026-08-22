import type { Metadata } from 'next';

import { SectionBoundary } from '@/components/common/SectionBoundary';
import { CompletedEventsSection } from '@/components/ui/CompletedEventsSection';
import { CompletedEventsSkeleton } from '@/components/ui/HomeSkeletons';
import { serverGetCompletedEvents } from '@/lib/api/server.service';
import { EventsList } from './EventsList';

export const metadata: Metadata = {
  title: 'Discover Events | MAD Entertainments',
  description:
    'Book tickets for DJ nights, concerts, music festivals, comedy shows, VIP events, and live theatre performances across the United States.',
  openGraph: {
    title: 'Discover Events | MAD Entertainments',
    description:
      'Browse and book tickets for the finest shows, music festivals, and entertainment experiences across the United States.',
    url: 'https://www.madentertainments.net/events',
    siteName: 'MAD Entertainments',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Events | MAD Entertainments',
    description: 'Book tickets for DJ nights, concerts, festivals and live events across the United States.',
  },
  alternates: {
    canonical: 'https://www.madentertainments.net/events',
  },
};

export const revalidate = 60;

async function CompletedEventsServerSection() {
  const events = await serverGetCompletedEvents();
  return <CompletedEventsSection initialEvents={events} />;
}

export default function PublicEventsPage() {
  return (
    <div className="pt-32 sm:pt-36 md:pt-40 pb-16 min-h-screen bg-background space-y-10 sm:space-y-14">
      <div className="container-mad space-y-8">
        {/* Static SSR header — visible to crawlers immediately */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h1 className="text-display-sm font-black text-white">Discover Events</h1>
          <p className="text-text-secondary text-sm">
            Book tickets for the finest shows, music festivals, live DJ operators, and theater plays.
          </p>
        </div>

        {/* Client-side interactive list fetching data on mount */}
        <EventsList />
      </div>

      {/* ─── Relive the Magic: Past Events & Moments ─── */}
      <SectionBoundary loadingFallback={<CompletedEventsSkeleton />}>
        <CompletedEventsServerSection />
      </SectionBoundary>
    </div>
  );
}
