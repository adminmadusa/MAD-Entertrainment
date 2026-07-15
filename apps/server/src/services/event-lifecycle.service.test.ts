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

  it('archives old events that ended more than 30 days ago', async () => {
    const now = new Date('2026-06-22T12:00:00.000Z');
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    vi.mocked(Event.updateMany).mockResolvedValue({ matchedCount: 2, modifiedCount: 2 } as any);

    const result = await EventLifecycleService.archiveOldEvents(now);

    expect(Event.updateMany).toHaveBeenCalledWith(
      {
        status: { $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        endDate: { $exists: true, $lt: thirtyDaysAgo },
        isDeleted: { $ne: true },
      },
      {
        $set: { status: EventStatus.ARCHIVED },
        $inc: { eventVersion: 1 },
      }
    );
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
  });
});
