import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../services/event-lifecycle.service", () => ({
  EventLifecycleService: {
    completeEndedEvents: vi
      .fn()
      .mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
    archiveOldEvents: vi.fn().mockResolvedValue({
      matchedCount: 0,
      modifiedCount: 0,
      evaluatedAt: new Date(),
    }),
  },
}));

import {
  startEventLifecycleWorker,
  stopEventLifecycleWorker,
  EVENT_COMPLETE_INTERVAL_MS,
  EVENT_ARCHIVE_INTERVAL_MS,
} from "./event-lifecycle.worker";
import { EventLifecycleService } from "../services/event-lifecycle.service";

describe("EventLifecycleWorker - Decoupled Cadence & Error Isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopEventLifecycleWorker();
    vi.useRealTimers();
  });

  it("configures decoupled intervals: complete (5m) and archive (1h)", () => {
    expect(EVENT_COMPLETE_INTERVAL_MS).toBe(300_000);
    expect(EVENT_ARCHIVE_INTERVAL_MS).toBe(3_600_000);
  });

  it("triggers completeEndedEvents at 5m and archiveOldEvents at 1h independently", async () => {
    startEventLifecycleWorker();

    // Advance 5 minutes (300_000ms): completeEndedEvents runs once, archiveOldEvents not yet
    await vi.advanceTimersByTimeAsync(300_000);
    expect(EventLifecycleService.completeEndedEvents).toHaveBeenCalledTimes(1);
    expect(EventLifecycleService.archiveOldEvents).toHaveBeenCalledTimes(0);

    // Advance another 5 minutes (total 10m): completeEndedEvents runs twice
    await vi.advanceTimersByTimeAsync(300_000);
    expect(EventLifecycleService.completeEndedEvents).toHaveBeenCalledTimes(2);
    expect(EventLifecycleService.archiveOldEvents).toHaveBeenCalledTimes(0);

    // Advance to 1 hour (total 3_600_000ms): archiveOldEvents runs once
    await vi.advanceTimersByTimeAsync(3_600_000 - 600_000);
    expect(EventLifecycleService.archiveOldEvents).toHaveBeenCalledTimes(1);
    expect(EventLifecycleService.completeEndedEvents).toHaveBeenCalledTimes(12);
  });

  it("isolates errors so failure in completeEndedEvents does not disrupt archiveOldEvents", async () => {
    vi.mocked(EventLifecycleService.completeEndedEvents).mockRejectedValueOnce(
      new Error("Transient Mongo timeout on event complete"),
    );

    startEventLifecycleWorker();

    // Advance 1 hour: completeEndedEvents failed on first cycle, but archive runs
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(EventLifecycleService.archiveOldEvents).toHaveBeenCalledTimes(1);
  });

  it("cleans up timers when stopEventLifecycleWorker is called", async () => {
    startEventLifecycleWorker();
    stopEventLifecycleWorker();

    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(EventLifecycleService.completeEndedEvents).not.toHaveBeenCalled();
    expect(EventLifecycleService.archiveOldEvents).not.toHaveBeenCalled();
  });
});
