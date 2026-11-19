import { EventLifecycleService } from "../services/event-lifecycle.service";
import { logger } from "../utils/logger";

export const EVENT_COMPLETE_INTERVAL_MS = 300_000; // 5 minutes
export const EVENT_ARCHIVE_INTERVAL_MS = 3_600_000; // 1 hour

let completeInterval: NodeJS.Timeout | null = null;
let archiveInterval: NodeJS.Timeout | null = null;

let runningComplete = false;
let runningArchive = false;

export function startEventLifecycleWorker(): void {
  if (completeInterval || archiveInterval) return;

  completeInterval = setInterval(async () => {
    if (runningComplete) return;
    runningComplete = true;
    try {
      await EventLifecycleService.completeEndedEvents();
    } catch (err) {
      logger.error({ err }, "Event lifecycle completeEndedEvents cycle failed");
    } finally {
      runningComplete = false;
    }
  }, EVENT_COMPLETE_INTERVAL_MS);
  completeInterval.unref?.();

  archiveInterval = setInterval(async () => {
    if (runningArchive) return;
    runningArchive = true;
    try {
      await EventLifecycleService.archiveOldEvents();
    } catch (err) {
      logger.error({ err }, "Event lifecycle archiveOldEvents cycle failed");
    } finally {
      runningArchive = false;
    }
  }, EVENT_ARCHIVE_INTERVAL_MS);
  archiveInterval.unref?.();

  logger.info(
    "Event lifecycle worker started with decoupled completeEndedEvents (5m) and archiveOldEvents (1h) intervals",
  );
}

export function stopEventLifecycleWorker(): void {
  if (completeInterval) {
    clearInterval(completeInterval);
    completeInterval = null;
  }
  if (archiveInterval) {
    clearInterval(archiveInterval);
    archiveInterval = null;
  }
  runningComplete = false;
  runningArchive = false;
  logger.info("Event lifecycle worker stopped");
}
