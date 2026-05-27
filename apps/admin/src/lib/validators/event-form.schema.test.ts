import { describe, expect, it } from "vitest";

import { eventFormSchema } from "./event-form.schema";

const baseValues = {
  title: "Neon Nights",
  description: "Live event",
  category: "concert",
  status: "draft",
  startDate: "2026-10-10T18:00",
  endDate: "",
  venueName: "Main Arena",
  tags: "edm,live",
  highlightsInput: "Headliner",
  organizerName: "MAD",
  refundPolicy: "No refunds",
  isFeatured: false,
  isAgeRestricted: true,
  minimumAge: 18,
  ticketingType: "custom" as const,
  selectedProfileId: "",
  tiers: [
    {
      name: "general",
      price: 999,
      capacity: 100,
      groupSize: "",
      minPerBooking: "",
      discount: "",
      taxPercent: "",
      startDate: "",
      endDate: "",
      description: "",
      isAvailable: true,
    },
  ],
};

describe("eventFormSchema", () => {
  it("accepts valid custom ticketing payload", () => {
    const result = eventFormSchema.safeParse(baseValues);
    expect(result.success).toBe(true);
  });

  it("rejects profile mode without selected profile", () => {
    const result = eventFormSchema.safeParse({
      ...baseValues,
      ticketingType: "profile",
      selectedProfileId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required title", () => {
    const result = eventFormSchema.safeParse({ ...baseValues, title: "   " });
    expect(result.success).toBe(false);
  });
});
