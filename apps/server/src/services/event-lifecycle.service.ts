import { EventStatus } from '@mad/shared';

import { Event } from '../models/event.schema';
import { auditLog } from '../utils/audit';
import { logger } from '../utils/logger';

export type CompleteExpiredEventsResult = {
  matchedCount: number;
  modifiedCount: number;
  evaluatedAt: Date;
};

export class EventLifecycleService {
  static async completeExpiredEvents(now: Date = new Date()): Promise<CompleteExpiredEventsResult> {
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
        'Automatically completed expired published events'
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
        description: `Automatically completed ${modifiedCount} expired published event(s).`,
      });
    }

    return {
      matchedCount,
      modifiedCount,
      evaluatedAt: now,
    };
  }
}
