import { describe, expect, it } from "vitest";

import {
  canPublish,
  isExpired,
  isScheduled,
  isVisibleNow,
  nextVisibilityTransition,
  resolveVisibilityState,
} from "./index";

describe("forms/visibility", () => {
  const now = new Date("2026-01-01T10:00:00.000Z");

  it("resolves draft/scheduled/active/expired states", () => {
    expect(resolveVisibilityState(false, undefined, undefined, now)).toBe(
      "draft",
    );
    expect(
      resolveVisibilityState(
        true,
        "2026-01-01T11:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
        now,
      ),
    ).toBe("scheduled");
    expect(
      resolveVisibilityState(
        true,
        "2026-01-01T09:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
        now,
      ),
    ).toBe("active");
    expect(
      resolveVisibilityState(
        true,
        "2026-01-01T08:00:00.000Z",
        "2026-01-01T09:00:00.000Z",
        now,
      ),
    ).toBe("expired");
  });

  it("evaluates visibility helpers", () => {
    expect(
      isVisibleNow(
        true,
        "2026-01-01T09:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
        now,
      ),
    ).toBe(true);
    expect(isScheduled("2026-01-01T11:00:00.000Z", now)).toBe(true);
    expect(isExpired("2026-01-01T09:00:00.000Z", now)).toBe(true);
  });

  it("checks publish guards and transition", () => {
    expect(
      canPublish("2026-01-01T09:00:00.000Z", "2026-01-01T12:00:00.000Z"),
    ).toBe(true);
    expect(
      canPublish("2026-01-01T12:00:00.000Z", "2026-01-01T09:00:00.000Z"),
    ).toBe(false);
    expect(
      nextVisibilityTransition(
        true,
        "2026-01-01T09:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
        now,
      ),
    ).toBe("active");
  });
});
