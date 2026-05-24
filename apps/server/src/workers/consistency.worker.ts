import { ConsistencyService } from '../services/consistency.service';
import { logger } from '../utils/logger';

let interval: NodeJS.Timeout | null = null;
let running = false;

export function startConsistencyWorker(): void {
  if (interval) return;

  interval = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await ConsistencyService.runRepairCycle();
    } catch (err) {
      logger.error({ err }, 'Consistency worker cycle failed');
    } finally {
      running = false;
    }
  }, 30_000);

  interval.unref?.();
  logger.info('Consistency worker started');
}

export function stopConsistencyWorker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    logger.info('Consistency worker stopped');
  }
}
