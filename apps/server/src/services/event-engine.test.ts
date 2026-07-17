import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { deriveEventCapabilities, EventLifecycle, BookingState, BookingReason } from '@mad/shared';

describe('Event Lifecycle & Booking Engine Boundary Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseEvent = {
    status: 'published',
    startDate: '2026-07-20T18:00:00.000Z', // 6:00 PM UTC
    endDate: '2026-07-20T22:00:00.000Z',   // 10:00 PM UTC
    bookingStartDate: '2026-07-01T00:00:00.000Z',
    bookingEndDate: '2026-07-20T17:59:59.000Z',
    isSoldOut: false,
    totalCapacity: 100,
    ticketsSold: 0,
    galleryPublished: false,
    galleryItemCount: 0,
    isDeleted: false
  };

  it('detects UPCOMING state before event start', () => {
    vi.setSystemTime(new Date('2026-06-30T23:59:59.000Z'));
    
    const caps = deriveEventCapabilities(baseEvent);
    expect(caps.lifecycle).toBe(EventLifecycle.UPCOMING);
    expect(caps.booking.status).toBe(BookingState.CLOSED);
    expect(caps.booking.reason).toBe(BookingReason.BOOKING_NOT_STARTED);
    expect(caps.capabilities.canBook).toBe(false);
  });

  it('detects UPCOMING with OPEN booking inside booking window', () => {
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const caps = deriveEventCapabilities(baseEvent);
    expect(caps.lifecycle).toBe(EventLifecycle.UPCOMING);
    expect(caps.booking.status).toBe(BookingState.OPEN);
    expect(caps.booking.reason).toBe(BookingReason.BOOKABLE);
    expect(caps.capabilities.canBook).toBe(true);
  });

  it('detects UPCOMING with CLOSED booking 1 second after booking close', () => {
    vi.setSystemTime(new Date('2026-07-20T18:00:00.000Z'));

    const caps = deriveEventCapabilities(baseEvent);
    expect(caps.lifecycle).toBe(EventLifecycle.LIVE); // Since now === startDate
    expect(caps.booking.status).toBe(BookingState.CLOSED);
    expect(caps.booking.reason).toBe(BookingReason.BOOKING_CLOSED);
    expect(caps.capabilities.canBook).toBe(false);
  });

  it('detects LIVE state exactly at event start and end boundaries', () => {
    const start = new Date(baseEvent.startDate);
    const end = new Date(baseEvent.endDate);

    // Exactly at start
    vi.setSystemTime(start);
    expect(deriveEventCapabilities(baseEvent).lifecycle).toBe(EventLifecycle.LIVE);

    // Exactly at end
    vi.setSystemTime(end);
    expect(deriveEventCapabilities(baseEvent).lifecycle).toBe(EventLifecycle.LIVE);

    // 1 second after end
    vi.setSystemTime(new Date(end.getTime() + 1000));
    expect(deriveEventCapabilities(baseEvent).lifecycle).toBe(EventLifecycle.COMPLETED);
  });

  it('falls back to default duration (4 hours) if endDate is missing', () => {
    const eventWithoutEndDate = {
      ...baseEvent,
      endDate: null,
      bookingEndDate: null
    };

    const start = new Date(eventWithoutEndDate.startDate).getTime();

    // 3 hours after start -> should be LIVE
    vi.setSystemTime(new Date(start + 3 * 60 * 60 * 1000));
    expect(deriveEventCapabilities(eventWithoutEndDate).lifecycle).toBe(EventLifecycle.LIVE);

    // 4 hours and 1 second after start -> should be COMPLETED
    vi.setSystemTime(new Date(start + 4 * 60 * 60 * 1000 + 1000));
    expect(deriveEventCapabilities(eventWithoutEndDate).lifecycle).toBe(EventLifecycle.COMPLETED);
  });

  it('enforces sold out rules', () => {
    const soldOutEvent = {
      ...baseEvent,
      isSoldOut: true
    };

    const capacityReachedEvent = {
      ...baseEvent,
      totalCapacity: 50,
      ticketsSold: 50
    };

    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));

    const caps1 = deriveEventCapabilities(soldOutEvent);
    expect(caps1.booking.status).toBe(BookingState.CLOSED);
    expect(caps1.booking.reason).toBe(BookingReason.SOLD_OUT);
    expect(caps1.capabilities.canBook).toBe(false);

    const caps2 = deriveEventCapabilities(capacityReachedEvent);
    expect(caps2.booking.status).toBe(BookingState.CLOSED);
    expect(caps2.booking.reason).toBe(BookingReason.CAPACITY_REACHED);
    expect(caps2.capabilities.canBook).toBe(false);
  });

  it('enforces gallery visibility and upload restrictions', () => {
    const upcomingEvent = { ...baseEvent, galleryItemCount: 10, galleryPublished: true };
    const completedEventDraft = { ...baseEvent, galleryItemCount: 10, galleryPublished: false };
    const completedEventPublished = { ...baseEvent, galleryItemCount: 10, galleryPublished: true };

    // 1. Upcoming event: cannot view, publish, or upload gallery
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'));
    const caps1 = deriveEventCapabilities(upcomingEvent);
    expect(caps1.gallery.status).toBe('DRAFT'); // Even if published is true, not completed
    expect(caps1.capabilities.canViewGallery).toBe(false);
    expect(caps1.capabilities.canUploadGallery).toBe(false);

    // 2. Completed event with unpublished settings
    vi.setSystemTime(new Date('2026-07-21T12:00:00.000Z'));
    const caps2 = deriveEventCapabilities(completedEventDraft);
    expect(caps2.gallery.status).toBe('DRAFT');
    expect(caps2.capabilities.canViewGallery).toBe(false);
    expect(caps2.capabilities.canUploadGallery).toBe(true);

    // 3. Completed event with published settings
    const caps3 = deriveEventCapabilities(completedEventPublished);
    expect(caps3.gallery.status).toBe('PUBLISHED');
    expect(caps3.capabilities.canViewGallery).toBe(true);
    expect(caps3.capabilities.canUploadGallery).toBe(true);
  });
});
