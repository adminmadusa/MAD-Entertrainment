import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventStatus, DEFAULT_EVENT_DURATION_HOURS } from '@mad/shared';

import { Event } from '../models/event.schema';
import { auditLog } from '../utils/audit';
import { logger } from '../utils/logger';
import { CacheService } from './cache.service';
import { EventLifecycleService } from './event-lifecycle.service';

vi.mock('../models/event.schema', () => ({
  Event: {
    updateMany: vi.fn(),
  },
}));

vi.mock('./cache.service', () => ({
  CacheService: {
    delPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../utils/audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EventLifecycleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('archives old events that ended more than 30 days ago (with and without explicit endDate)', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultDurationMs = DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000;
    const thirtyDaysPlusDurationAgo = new Date(thirtyDaysAgo.getTime() - defaultDurationMs);

    vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 2, modifiedCount: 2 } as any);

    const result = await EventLifecycleService.archiveOldEvents(now);

    expect(Event.updateMany).toHaveBeenCalledWith(
      {
        status: { $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        isDeleted: { $ne: true },
        $or: [
          { endDate: { $exists: true, $ne: null, $lt: thirtyDaysAgo } },
          { endDate: null, startDate: { $lt: thirtyDaysPlusDurationAgo } },
          { endDate: { $exists: false }, startDate: { $lt: thirtyDaysPlusDurationAgo } },
        ],
      },
      {
        $set: { status: EventStatus.ARCHIVED },
        $inc: { eventVersion: 1 },
      }
    );
    expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
    expect(result).toEqual({ matchedCount: 2, modifiedCount: 2, evaluatedAt: now });
    expect(logger.info).toHaveBeenCalledWith(
      { matchedCount: 2, modifiedCount: 2, evaluatedAt: now.toISOString() },
      'Automatically archived old events'
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENTS_AUTO_ARCHIVED',
        actor: { type: 'system' },
        status: 'success',
        metadata: expect.objectContaining({
          matchedCount: 2,
          modifiedCount: 2,
          evaluatedAt: now.toISOString(),
        }),
      })
    );
  });

  it('does not archive events if they are not older than 30 days past end date', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as any);

    await EventLifecycleService.archiveOldEvents(now);

    expect(Event.updateMany).toHaveBeenCalled();
    expect(CacheService.delPattern).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('is idempotent on repeated runs after events are already archived', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany)
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 } as any)
      .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 } as any);

    const firstRun = await EventLifecycleService.archiveOldEvents(now);
    const secondRun = await EventLifecycleService.archiveOldEvents(now);

    expect(firstRun.modifiedCount).toBe(1);
    expect(secondRun.modifiedCount).toBe(0);
    expect(Event.updateMany).toHaveBeenCalledTimes(2);
    expect(CacheService.delPattern).toHaveBeenCalledTimes(1);
  });

  describe('completeEndedEvents', () => {
    it('marks ended published events as completed and invalidates event cache', async () => {
      const now = new Date('2026-06-22T12:00:00.000Z');
      const defaultDurationMs = DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000;

      vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 3, modifiedCount: 3 } as any);

      const result = await EventLifecycleService.completeEndedEvents(now);

      expect(Event.updateMany).toHaveBeenCalledWith(
        {
          status: EventStatus.PUBLISHED,
          isDeleted: { $ne: true },
          $or: [
            { endDate: { $exists: true, $ne: null, $lt: now } },
            { endDate: null, startDate: { $lt: new Date(now.getTime() - defaultDurationMs) } },
            { endDate: { $exists: false }, startDate: { $lt: new Date(now.getTime() - defaultDurationMs) } },
          ],
        },
        {
          $set: { status: EventStatus.COMPLETED },
          $inc: { eventVersion: 1 },
        }
      );
      expect(CacheService.delPattern).toHaveBeenCalledWith('events:*');
      expect(result).toEqual({ matchedCount: 3, modifiedCount: 3 });
      expect(logger.info).toHaveBeenCalledWith(
        { matchedCount: 3, modifiedCount: 3, evaluatedAt: now.toISOString() },
        'Automatically completed ended events'
      );
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENTS_AUTO_COMPLETED',
          actor: { type: 'system' },
          status: 'success',
          metadata: expect.objectContaining({
            matchedCount: 3,
            modifiedCount: 3,
            evaluatedAt: now.toISOString(),
          }),
        })
      );
    });

    it('does not log or audit or invalidate cache if no events were modified', async () => {
      const now = new Date('2026-06-22T12:00:00.000Z');
      vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as any);

      const result = await EventLifecycleService.completeEndedEvents(now);

      expect(result).toEqual({ matchedCount: 0, modifiedCount: 0 });
      expect(CacheService.delPattern).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });
  });
});
