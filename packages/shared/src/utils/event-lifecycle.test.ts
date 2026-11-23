import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventStatus } from '../constants';
import {
  deriveEventLifecycleState,
  getEventEndDate,
  canBook,
  isEventLiveForScanning,
} from './event-lifecycle';

describe('Event Lifecycle Utilities', () => {
  const baseTime = new Date('2026-07-06T18:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('deriveEventLifecycleState', () => {
    it('returns administrative status overrides regardless of dates', () => {
      expect(
        deriveEventLifecycleState({
          status: EventStatus.DRAFT,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe('draft');

      expect(
        deriveEventLifecycleState({
          status: EventStatus.CANCELLED,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe('cancelled');

      expect(
        deriveEventLifecycleState({
          status: EventStatus.COMPLETED,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe('completed');
    });

    it('returns live when current time is between start and end date', () => {
      expect(
        deriveEventLifecycleState({
          status: EventStatus.PUBLISHED,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe('live');
    });

    it('returns completed when event has passed end date', () => {
      expect(
        deriveEventLifecycleState({
          status: EventStatus.PUBLISHED,
          startDate: '2026-07-06T12:00:00.000Z',
          endDate: '2026-07-06T16:00:00.000Z',
        })
      ).toBe('completed');
    });

    it('returns upcoming when event is scheduled for the future', () => {
      expect(
        deriveEventLifecycleState({
          status: EventStatus.PUBLISHED,
          startDate: '2026-07-06T20:00:00.000Z',
          endDate: '2026-07-06T23:00:00.000Z',
        })
      ).toBe('upcoming');
    });
  });

  describe('isEventLiveForScanning', () => {
    it('returns true when event is actively live', () => {
      const isLive = isEventLiveForScanning({
        status: EventStatus.PUBLISHED,
        startDate: '2026-07-06T17:00:00.000Z',
        endDate: '2026-07-06T21:00:00.000Z',
      });
      expect(isLive).toBe(true);
    });

    it('returns true during early check-in window (e.g. 2 hours before start)', () => {
      // Event starts at 20:00, baseTime is 18:00 (2 hours before start, default window is 4h)
      const isLive = isEventLiveForScanning({
        status: EventStatus.PUBLISHED,
        startDate: '2026-07-06T20:00:00.000Z',
        endDate: '2026-07-06T23:00:00.000Z',
      });
      expect(isLive).toBe(true);
    });

    it('returns false for past events that have concluded', () => {
      // Event ended at 16:00, baseTime is 18:00
      const isLive = isEventLiveForScanning({
        status: EventStatus.PUBLISHED,
        startDate: '2026-07-06T12:00:00.000Z',
        endDate: '2026-07-06T16:00:00.000Z',
      });
      expect(isLive).toBe(false);
    });

    it('returns false for distant future events (e.g. tomorrow or next month)', () => {
      // Event starts tomorrow at 18:00
      const isLive = isEventLiveForScanning({
        status: EventStatus.PUBLISHED,
        startDate: '2026-07-07T18:00:00.000Z',
        endDate: '2026-07-07T22:00:00.000Z',
      });
      expect(isLive).toBe(false);
    });

    it('returns false for cancelled, completed, or draft events even if timing matches', () => {
      expect(
        isEventLiveForScanning({
          status: EventStatus.CANCELLED,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe(false);

      expect(
        isEventLiveForScanning({
          status: EventStatus.COMPLETED,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe(false);

      expect(
        isEventLiveForScanning({
          status: EventStatus.DRAFT,
          startDate: '2026-07-06T17:00:00.000Z',
          endDate: '2026-07-06T22:00:00.000Z',
        })
      ).toBe(false);
    });
  });
});
