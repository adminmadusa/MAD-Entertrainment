import { describe, it, expect } from 'vitest';
import { BookingStatus, EventStatus } from '../constants';
import { getBookingLifecycle } from './booking-lifecycle';

describe('getBookingLifecycle', () => {
  it('returns cancelled when booking status is cancelled', () => {
    const result = getBookingLifecycle({
      status: BookingStatus.CANCELLED,
    });
    expect(result).toBe('cancelled');
  });

  it('returns refunded when booking status is refunded', () => {
    const result = getBookingLifecycle({
      status: BookingStatus.REFUNDED,
    });
    expect(result).toBe('refunded');
  });

  it('returns cancelled when event status is cancelled', () => {
    const result = getBookingLifecycle({
      status: BookingStatus.CONFIRMED,
      eventId: {
        status: EventStatus.CANCELLED,
        startDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect(result).toBe('cancelled');
  });

  it('returns past when eventId is missing, unpopulated string, or invalid date (no sinkhole into upcoming)', () => {
    expect(getBookingLifecycle({ status: BookingStatus.CONFIRMED, eventId: null })).toBe('past');
    expect(getBookingLifecycle({ status: BookingStatus.CONFIRMED, eventId: undefined })).toBe('past');
    expect(getBookingLifecycle({ status: BookingStatus.CONFIRMED, eventId: 'raw-string-id' as any })).toBe('past');
    expect(
      getBookingLifecycle({
        status: BookingStatus.CONFIRMED,
        eventId: { status: EventStatus.PUBLISHED, startDate: 'invalid-date' },
      })
    ).toBe('past');
  });

  it('returns live when event date window is currently active', () => {
    const now = Date.now();
    const result = getBookingLifecycle({
      status: BookingStatus.CONFIRMED,
      eventId: {
        status: EventStatus.PUBLISHED,
        startDate: new Date(now - 3600000).toISOString(), // started 1 hr ago
        endDate: new Date(now + 3600000).toISOString(), // ends in 1 hr
      },
    });
    expect(result).toBe('live');
  });

  it('returns upcoming when event date is in the future', () => {
    const now = Date.now();
    const result = getBookingLifecycle({
      status: BookingStatus.CONFIRMED,
      eventId: {
        status: EventStatus.PUBLISHED,
        startDate: new Date(now + 86400000).toISOString(), // starts tomorrow
        endDate: new Date(now + 90000000).toISOString(),
      },
    });
    expect(result).toBe('upcoming');
  });

  it('returns past when event date has already elapsed', () => {
    const now = Date.now();
    const result = getBookingLifecycle({
      status: BookingStatus.CONFIRMED,
      eventId: {
        status: EventStatus.PUBLISHED,
        startDate: new Date(now - 86400000).toISOString(), // yesterday
        endDate: new Date(now - 72000000).toISOString(),
      },
    });
    expect(result).toBe('past');
  });
});
