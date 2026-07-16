import { EventStatus } from '@mad/shared';

import { Event } from '../models/event.schema';
import { auditLog } from '../utils/audit';
import { logger } from '../utils/logger';

export type ArchiveOldEventsResult = {
  matchedCount: number;
  modifiedCount: number;
  evaluatedAt: Date;
};

export class EventLifecycleService {
  /**
   * Automatically marks ended published events as completed.
   */
  static async completeEndedEvents(now: Date = new Date()): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await Event.updateMany(
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

    const matchedCount = result.matchedCount ?? 0;
    const modifiedCount = result.modifiedCount ?? 0;

    if (modifiedCount > 0) {
      logger.info(
        { matchedCount, modifiedCount, evaluatedAt: now.toISOString() },
        'Automatically completed ended events'
      );

      auditLog({
        action: 'EVENTS_AUTO_COMPLETED',
        actor: { type: 'system' },
        status: 'success',
        metadata: {
          matchedCount,
          modifiedCount,
          evaluatedAt: now.toISOString(),
        },
        description: `Automatically marked ${modifiedCount} ended event(s) as completed.`,
      });
    }

    return { matchedCount, modifiedCount };
  }

  /**
   * Automatically archives events that ended more than 30 days ago.
   */
  static async archiveOldEvents(now: Date = new Date()): Promise<ArchiveOldEventsResult> {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Event.updateMany(
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

    const matchedCount = result.matchedCount ?? 0;
    const modifiedCount = result.modifiedCount ?? 0;

    if (modifiedCount > 0) {
      logger.info(
        { matchedCount, modifiedCount, evaluatedAt: now.toISOString() },
        'Automatically archived old events'
      );

      auditLog({
        action: 'EVENTS_AUTO_ARCHIVED',
        actor: { type: 'system' },
        status: 'success',
        metadata: {
          matchedCount,
          modifiedCount,
          evaluatedAt: now.toISOString(),
        },
        description: `Automatically archived ${modifiedCount} old event(s).`,
      });
    }

    return {
      matchedCount,
      modifiedCount,
      evaluatedAt: now,
    };
  }
}
