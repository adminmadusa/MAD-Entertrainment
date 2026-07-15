import { EventLifecycleService } from '../services/event-lifecycle.service';
import { logger } from '../utils/logger';

const EVENT_LIFECYCLE_INTERVAL_MS = 60_000;

let interval: NodeJS.Timeout | null = null;
let running = false;

export function startEventLifecycleWorker(): void {
  if (interval) return;

  interval = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await EventLifecycleService.archiveOldEvents();
    } catch (err) {
      logger.error({ err }, 'Event lifecycle worker cycle failed');
    } finally {
      running = false;
    }
  }, EVENT_LIFECYCLE_INTERVAL_MS);

  interval.unref?.();
  logger.info('Event lifecycle worker started');
}

export function stopEventLifecycleWorker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    running = false;
    logger.info('Event lifecycle worker stopped');
  }
}
