import { ConsistencyService } from "../services/consistency.service";
import { logger } from "../utils/logger";

export const CONSISTENCY_TIER_1_INTERVAL_MS = 60_000;
export const CONSISTENCY_TIER_2_INTERVAL_MS = 120_000;
export const CONSISTENCY_TIER_3_INTERVAL_MS = 30 * 60_000;

let tier1Interval: NodeJS.Timeout | null = null;
let tier2Interval: NodeJS.Timeout | null = null;
let tier3Interval: NodeJS.Timeout | null = null;

let runningTier1 = false;
let runningTier2 = false;
let runningTier3 = false;

export function startConsistencyWorker(): void {
  if (tier1Interval || tier2Interval || tier3Interval) return;

  tier1Interval = setInterval(async () => {
    if (runningTier1) return;
    runningTier1 = true;
    try {
      await ConsistencyService.runFastExpirationCycle();
    } catch (err) {
      logger.error({ err }, "Consistency worker Tier 1 cycle failed");
    } finally {
      runningTier1 = false;
    }
  }, CONSISTENCY_TIER_1_INTERVAL_MS);
  tier1Interval.unref?.();

  tier2Interval = setInterval(async () => {
    if (runningTier2) return;
    runningTier2 = true;
    try {
      await ConsistencyService.runStandardReconciliationCycle();
    } catch (err) {
      logger.error({ err }, "Consistency worker Tier 2 cycle failed");
    } finally {
      runningTier2 = false;
    }
  }, CONSISTENCY_TIER_2_INTERVAL_MS);
  tier2Interval.unref?.();

  tier3Interval = setInterval(async () => {
    if (runningTier3) return;
    runningTier3 = true;
    try {
      await ConsistencyService.runHistoricalCatchUpCycle();
    } catch (err) {
      logger.error({ err }, "Consistency worker Tier 3 cycle failed");
    } finally {
      runningTier3 = false;
    }
  }, CONSISTENCY_TIER_3_INTERVAL_MS);
  tier3Interval.unref?.();

  logger.info(
    "Consistency worker started with independent Tier 1 (60s), Tier 2 (120s), and Tier 3 (30m) intervals",
  );
}

export function stopConsistencyWorker(): void {
  if (tier1Interval) {
    clearInterval(tier1Interval);
    tier1Interval = null;
  }
  if (tier2Interval) {
    clearInterval(tier2Interval);
    tier2Interval = null;
  }
  if (tier3Interval) {
    clearInterval(tier3Interval);
    tier3Interval = null;
  }
  runningTier1 = false;
  runningTier2 = false;
  runningTier3 = false;
  logger.info("Consistency worker stopped");
}
