import { describe, expect, it } from "vitest";
import { EventResponseSchema } from "./event-response";

const baseEvent = {
  _id: "evt_1",
  title: "Summer Night",
  slug: "summer-night",
  description: "Live show",
  category: "concert",
  status: "published",
  bookingMode: "general_admission",
  bannerImage: { url: "https://img.example.com/a.jpg", publicId: "a" },
  coverImage: { url: "https://img.example.com/a.jpg", publicId: "a" },
  startDate: "2026-06-01T18:00:00.000Z",
  venue: "Arena",
  isFeatured: false,
  isSoldOut: false,
  tags: [],
  highlights: [],
  totalCapacity: 200,
  soldCount: 20,
  ticketOverrides: [],
  ticketTiers: [],
  artistIds: [],
  djOperatorIds: [],
  createdAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

describe("EventResponseSchema", () => {
  it("accepts canonical event transport payload", () => {
    expect(EventResponseSchema.safeParse(baseEvent).success).toBe(true);
  });

  it("allows additive optional fields without breaking parse", () => {
    const payload = {
      ...baseEvent,
      organizerName: "MAD",
      refundPolicy: "No refunds",
      unknownFutureField: "safe-ignore",
    };
    expect(EventResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("keeps nullable widening explicit and safe", () => {
    const payload = {
      ...baseEvent,
      endDate: undefined,
      ticketProfileId: undefined,
    };
    expect(EventResponseSchema.safeParse(payload).success).toBe(true);
  });
});
