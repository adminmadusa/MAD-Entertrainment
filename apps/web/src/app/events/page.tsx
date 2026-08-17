import type { Metadata } from 'next';

import { EventsList } from './EventsList';

export const metadata: Metadata = {
  title: 'Discover Events | MAD Entertrainment',
  description:
    'Book tickets for DJ nights, concerts, music festivals, comedy shows, VIP events, and live theatre performances in India.',
  openGraph: {
    title: 'Discover Events | MAD Entertrainment',
    description:
      'Browse and book tickets for the finest shows, music festivals, DJ operators, and theater plays across India.',
    url: 'https://www.madentertainments.net/events',
    siteName: 'MAD Entertrainment',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Discover Events | MAD Entertrainment',
    description: 'Book tickets for DJ nights, concerts, festivals and live events in India.',
  },
  alternates: {
    canonical: 'https://www.madentertainments.net/events',
  },
};

export default function PublicEventsPage() {
  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
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
    </div>
  );
}
