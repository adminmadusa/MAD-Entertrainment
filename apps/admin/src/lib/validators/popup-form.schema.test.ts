import { describe, expect, it } from "vitest";

import { popupFormSchema } from "./popup-form.schema";

const validValues = {
  name: "Summer Promo",
  title: "Get 20% Off",
  description: "desc",
  ctaText: "Claim",
  ctaUrl: "https://mad.com/events",
  trigger: "on_load" as const,
  triggerDelay: 3000,
  cooldownHours: 24,
  priority: 0,
  isActive: true,
  showOnPages: "/,/events",
  linkedEventId: "",
  startDate: "2026-10-10T10:00",
  endDate: "2026-10-11T10:00",
  image: null,
};

describe("popupFormSchema", () => {
  it("accepts valid values", () => {
    expect(popupFormSchema.safeParse(validValues).success).toBe(true);
  });

  it("rejects invalid date range", () => {
    expect(
      popupFormSchema.safeParse({
        ...validValues,
        startDate: "2026-10-11T10:00",
        endDate: "2026-10-10T10:00",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid ctaUrl protocol", () => {
    expect(
      popupFormSchema.safeParse({ ...validValues, ctaUrl: "mad.com/events" })
        .success,
    ).toBe(false);
  });
});
