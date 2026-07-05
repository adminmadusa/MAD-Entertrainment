import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventStatus } from '@mad/shared';

import { Event } from '../models/event.schema';
import { auditLog } from '../utils/audit';
import { logger } from '../utils/logger';
import { EventLifecycleService } from './event-lifecycle.service';

vi.mock('../models/event.schema', () => ({
  Event: {
    updateMany: vi.fn(),
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

  it('completes expired published events with a guarded lifecycle-only update', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 2, modifiedCount: 2 } as any);

    const result = await EventLifecycleService.completeExpiredEvents(now);

    expect(Event.updateMany).toHaveBeenCalledWith(
      {
        status: EventStatus.PUBLISHED,
        endDate: { $exists: true, $lt: now },
        isDeleted: { $ne: true },
      },
      {
        $set: { status: EventStatus.COMPLETED },
        $inc: { eventVersion: 1 },
      }
    );
    expect(result).toEqual({ matchedCount: 2, modifiedCount: 2, evaluatedAt: now });
    expect(logger.info).toHaveBeenCalledWith(
      { matchedCount: 2, modifiedCount: 2, evaluatedAt: now.toISOString() },
      'Automatically completed expired published events'
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EVENTS_AUTO_COMPLETED',
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

  it('does not complete future, cancelled, postponed, completed, deleted, or missing-endDate events', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 } as any);

    await EventLifecycleService.completeExpiredEvents(now);

    expect(Event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: EventStatus.PUBLISHED,
        endDate: { $exists: true, $lt: now },
        isDeleted: { $ne: true },
      }),
      expect.any(Object)
    );
    expect(Event.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: {
          $in: [
            EventStatus.DRAFT,
            EventStatus.POSTPONED,
            EventStatus.CANCELLED,
            EventStatus.COMPLETED,
          ],
        },
      }),
      expect.any(Object)
    );
    expect(logger.info).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('is idempotent on repeated runs after events are already completed', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany)
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 } as any)
      .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 } as any);

    const firstRun = await EventLifecycleService.completeExpiredEvents(now);
    const secondRun = await EventLifecycleService.completeExpiredEvents(now);

    expect(firstRun.modifiedCount).toBe(1);
    expect(secondRun.modifiedCount).toBe(0);
    expect(Event.updateMany).toHaveBeenCalledTimes(2);
  });

  it('is safe under concurrent execution because every execution uses the same published-only guard', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    vi.mocked(Event.updateMany)
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 } as any)
      .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 } as any);

    const [workerA, workerB] = await Promise.all([
      EventLifecycleService.completeExpiredEvents(now),
      EventLifecycleService.completeExpiredEvents(now),
    ]);

    expect(workerA.modifiedCount + workerB.modifiedCount).toBe(1);
    expect(Event.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: EventStatus.PUBLISHED }),
      expect.objectContaining({ $set: { status: EventStatus.COMPLETED } })
    );
    expect(Event.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: EventStatus.PUBLISHED }),
      expect.objectContaining({ $set: { status: EventStatus.COMPLETED } })
    );
  });
});
