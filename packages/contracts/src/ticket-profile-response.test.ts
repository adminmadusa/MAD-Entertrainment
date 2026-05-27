import { describe, expect, it } from "vitest";
import { TicketProfileResponseSchema } from "./ticket-profile-response";

const baseProfile = {
  _id: "507f1f77bcf86cd799439011",
  name: "Default Profile",
  description: "Reusable tiers",
  groups: [],
  isActive: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("TicketProfileResponseSchema", () => {
  it("accepts canonical payload", () => {
    expect(TicketProfileResponseSchema.safeParse(baseProfile).success).toBe(
      true,
    );
  });

  it("allows additive optional fields and nested array widening", () => {
    const payload = {
      ...baseProfile,
      futureField: "safe",
      groups: [
        {
          name: "General",
          slug: "general",
          tickets: [],
        },
      ],
    };
    expect(TicketProfileResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts optional nested offer branches", () => {
    const payload = {
      ...baseProfile,
      groups: [
        {
          name: "General",
          slug: "general",
          tickets: [
            {
              tier: "general",
              name: "General Admission",
              price: 100,
              isFree: false,
              totalCapacity: 100,
              minPerBooking: 1,
              maxPerBooking: 10,
              groupSize: 1,
              isActive: true,
            },
          ],
        },
      ],
    };
    expect(TicketProfileResponseSchema.safeParse(payload).success).toBe(true);
  });
});
