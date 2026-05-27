import { describe, expect, it } from "vitest";
import { PopupResponseSchema } from "./popup-response";

const basePopup = {
  _id: "507f1f77bcf86cd799439011",
  name: "Launch Banner",
  title: "Early Bird Offer",
  trigger: "on_load",
  triggerDelay: 0,
  cooldownHours: 24,
  priority: 1,
  showOnPages: ["/"],
  isActive: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("PopupResponseSchema", () => {
  it("accepts canonical popup payload", () => {
    expect(PopupResponseSchema.safeParse(basePopup).success).toBe(true);
  });

  it("allows missing linked event and schedule windows", () => {
    const payload = {
      ...basePopup,
      linkedEvent: undefined,
      linkedEventId: undefined,
      startDate: undefined,
      endDate: undefined,
    };
    expect(PopupResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("allows additive optional fields safely", () => {
    const payload = {
      ...basePopup,
      description: "Promo",
      futureField: "ignored",
    };
    expect(PopupResponseSchema.safeParse(payload).success).toBe(true);
  });
});
