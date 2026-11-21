import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../services/consistency.service", () => ({
  ConsistencyService: {
    runFastExpirationCycle: vi.fn().mockResolvedValue({
      expiredReservations: 0,
      phantomRedisLocks: 0,
      logicallyExpiredBookings: 0,
    }),
    runStandardReconciliationCycle: vi.fn().mockResolvedValue({}),
    runHistoricalCatchUpCycle: vi.fn().mockResolvedValue({}),
    runRepairCycle: vi.fn().mockResolvedValue({}),
  },
}));

import {
  startConsistencyWorker,
  stopConsistencyWorker,
  CONSISTENCY_TIER_1_INTERVAL_MS,
  CONSISTENCY_TIER_2_INTERVAL_MS,
  CONSISTENCY_TIER_3_INTERVAL_MS,
} from "./consistency.worker";
import { ConsistencyService } from "../services/consistency.service";

describe("ConsistencyWorker - Tiered Scheduling & Error Isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopConsistencyWorker();
    vi.useRealTimers();
  });

  it("configures independent interval constants for Tier 1 (60s), Tier 2 (120s), and Tier 3 (30m)", () => {
    expect(CONSISTENCY_TIER_1_INTERVAL_MS).toBe(60_000);
    expect(CONSISTENCY_TIER_2_INTERVAL_MS).toBe(120_000);
    expect(CONSISTENCY_TIER_3_INTERVAL_MS).toBe(1_800_000);
  });

  it("triggers Tier 1 at 60s, Tier 2 at 120s, and Tier 3 at 1800s independently", async () => {
    startConsistencyWorker();

    // Advance 60s -> Tier 1 fires (1), Tier 2 (0), Tier 3 (0)
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ConsistencyService.runFastExpirationCycle).toHaveBeenCalledTimes(1);
    expect(
      ConsistencyService.runStandardReconciliationCycle,
    ).toHaveBeenCalledTimes(0);
    expect(ConsistencyService.runHistoricalCatchUpCycle).toHaveBeenCalledTimes(
      0,
    );

    // Advance another 60s (total 120s) -> Tier 1 fires again (2), Tier 2 fires (1), Tier 3 (0)
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ConsistencyService.runFastExpirationCycle).toHaveBeenCalledTimes(2);
    expect(
      ConsistencyService.runStandardReconciliationCycle,
    ).toHaveBeenCalledTimes(1);
    expect(ConsistencyService.runHistoricalCatchUpCycle).toHaveBeenCalledTimes(
      0,
    );

    // Advance to 1800s -> Tier 3 fires (1)
    await vi.advanceTimersByTimeAsync(1_800_000 - 120_000);
    expect(ConsistencyService.runHistoricalCatchUpCycle).toHaveBeenCalledTimes(
      1,
    );
  });

  it("isolates errors so a failure in Tier 2 does not disrupt Tier 1 execution", async () => {
    vi.mocked(
      ConsistencyService.runStandardReconciliationCycle,
    ).mockRejectedValueOnce(new Error("Tier 2 database timeout"));

    startConsistencyWorker();

    // Advance 120s: Tier 1 runs twice, Tier 2 fails once
    await vi.advanceTimersByTimeAsync(120_000);
    expect(
      ConsistencyService.runStandardReconciliationCycle,
    ).toHaveBeenCalledTimes(1);
    expect(ConsistencyService.runFastExpirationCycle).toHaveBeenCalledTimes(2);

    // Advance another 60s: Tier 1 continues to run cleanly
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ConsistencyService.runFastExpirationCycle).toHaveBeenCalledTimes(3);
  });

  it("cleans up all timer intervals on stopConsistencyWorker", async () => {
    startConsistencyWorker();
    stopConsistencyWorker();

    await vi.advanceTimersByTimeAsync(1_800_000);
    expect(ConsistencyService.runFastExpirationCycle).not.toHaveBeenCalled();
    expect(
      ConsistencyService.runStandardReconciliationCycle,
    ).not.toHaveBeenCalled();
    expect(ConsistencyService.runHistoricalCatchUpCycle).not.toHaveBeenCalled();
  });
});
