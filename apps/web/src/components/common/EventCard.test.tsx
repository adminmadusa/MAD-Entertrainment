import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EventCard } from './EventCard';
import { EventCategory, EventStatus, TicketTier } from '@mad/shared';
import type { Event } from '@mad/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const eventStart = new Date(Date.now() + 30 * DAY_MS).toISOString();
const eventEnd = new Date(Date.now() + 30 * DAY_MS + 5 * 60 * 60 * 1000).toISOString();

const mockActiveEvent: Event = {
  _id: 'event-123',
  title: 'Holi X-Plosion Night',
  slug: 'holi-x-plosion-night',
  description: 'Celebrate color and music at the annual Holi festival.',
  category: EventCategory.CONCERT,
  status: EventStatus.PUBLISHED,
  lifecycle: 'UPCOMING',
  startDate: eventStart,
  endDate: eventEnd,
  currency: 'USD',
  bannerImage: {
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    publicId: 'holi-banner',
  },
  ticketTiers: [
    {
      tier: TicketTier.GENERAL,
      name: 'General',
      price: 25,
    },
  ],
  venue: 'The Factory, 123 Music Lane, New York, NY',
  totalCapacity: 100,
  soldCount: 10,
};

const mockCompletedEvent: Event = {
  ...mockActiveEvent,
  _id: 'event-456',
  title: 'Neon Pulse DJ Night',
  slug: 'neon-pulse-dj-night',
  lifecycle: 'COMPLETED',
  gallery: {
    status: 'PUBLISHED',
    itemCount: 42,
  },
};

describe('EventCard Component', () => {
  it('renders active event title, category, price, and CTA correctly', () => {
    render(<EventCard event={mockActiveEvent} variant="active" density="compact" />);

    expect(screen.getByText('Holi X-Plosion Night')).toBeInTheDocument();
    expect(screen.getByText(/CONCERT/i)).toBeInTheDocument();
    expect(screen.getByText('$25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument();
  });

  it('renders completed event with Ended badge and Gallery CTA when published', () => {
    render(<EventCard event={mockCompletedEvent} variant="completed" density="compact" />);

    expect(screen.getByText('Neon Pulse DJ Night')).toBeInTheDocument();
    expect(screen.getByText(/Ended/i)).toBeInTheDocument();
    expect(screen.getByText('42 Photos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gallery →/i })).toBeInTheDocument();
  });

  it('renders fallback when banner image is missing', () => {
    const eventWithoutBanner = { ...mockActiveEvent, bannerImage: undefined };
    render(<EventCard event={eventWithoutBanner} variant="active" />);

    expect(screen.getByText('🎧')).toBeInTheDocument();
  });
});
