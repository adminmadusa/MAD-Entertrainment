import { describe, expect, it } from 'vitest';

import { AdminEvent } from '@/lib/api/admin/event.service';

import { getDefaultEventFormValues, mapEventToFormValues, mapFormValuesToPayload } from './event-form.mapper';

describe('event-form.mapper', () => {
  it('maps API event to form values for edit mode', () => {
    const apiEvent: AdminEvent = {
      _id: 'evt_1',
      title: 'Neon Nights',
      slug: 'neon-nights',
      description: 'Live event',
      category: 'concert',
      mode: 'general',
      status: 'published',
      venue: 'Arena',
      startDate: '2026-10-10T18:00:00.000Z',
      endDate: '2026-10-10T22:00:00.000Z',
      ticketTiers: [{ name: 'General', price: 1000, capacity: 100, isAvailable: true }],
      totalCapacity: 100,
      isFeatured: true,
      isAgeRestricted: true,
      minimumAge: 21,
      tags: ['edm'],
      createdAt: '2026-01-01T00:00:00.000Z',
      coverImage: { url: 'https://x/y.jpg', publicId: 'p1' },
    };

    const values = mapEventToFormValues(apiEvent);
    expect(values.title).toBe('Neon Nights');
    expect(values.category).toBe('concert');
    expect(values.coverImage?.publicId).toBe('p1');
    expect(values.tiers.length).toBe(1);
  });

  it('maps form values to profile payload', () => {
    const values = getDefaultEventFormValues();
    values.title = 'Profile Event';
    values.description = 'Description';
    values.venueName = 'Venue';
    values.startDate = '2026-10-10T18:00';
    values.coverImage = { url: 'https://x/y.jpg', publicId: 'p1' };
    values.ticketingType = 'profile';
    values.selectedProfileId = 'profile_1';
    values.overrides = { general: { totalCapacity: 120, isActive: true } };

    const payload = mapFormValuesToPayload(values);
    expect(payload.ticketProfileId).toBe('profile_1');
    expect(payload.ticketTiers).toEqual([]);
    expect(payload.ticketOverrides?.[0]?.tier).toBe('general');
  });

  it('maps form values to custom tier payload', () => {
    const values = getDefaultEventFormValues();
    values.title = 'Custom Event';
    values.description = 'Description';
    values.venueName = 'Venue';
    values.startDate = '2026-10-10T18:00';
    values.coverImage = { url: 'https://x/y.jpg', publicId: 'p1' };
    values.tiers = [{ ...values.tiers[0], name: 'general', price: 499, capacity: 50 }];

    const payload = mapFormValuesToPayload(values);
    expect(payload.ticketProfileId).toBeNull();
    expect(payload.ticketTiers?.length).toBe(1);
    expect(payload.totalCapacity).toBe(50);
  });
});
