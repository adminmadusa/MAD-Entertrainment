import { z } from "zod";

export const eventTierSchema = z.object({
  name: z.string().min(1),
  price: z.union([z.number().min(0), z.literal("")]),
  capacity: z.union([z.number().min(1), z.literal("")]),
  groupSize: z.union([z.number().min(1), z.literal("")]),
  minPerBooking: z.union([z.number().min(1), z.literal("")]),
  discount: z.union([z.number().min(0), z.literal("")]),
  taxPercent: z.union([z.number().min(0), z.literal("")]),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  isAvailable: z.boolean(),
});

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().min(1, "Description is required"),
    category: z.string().trim().min(1, "Category is required"),
    status: z.string().trim().min(1, "Status is required"),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().optional(),
    venueName: z.string().trim().min(1, "Venue is required"),
    tags: z.string(),
    highlightsInput: z.string(),
    organizerName: z.string(),
    refundPolicy: z.string(),
    isFeatured: z.boolean(),
    isAgeRestricted: z.boolean(),
    minimumAge: z.number().int().min(0).max(100),
    ticketingType: z.enum(["custom", "profile"]),
    selectedProfileId: z.string(),
    tiers: z.array(eventTierSchema),
  })
  .superRefine((data, ctx) => {
    if (data.ticketingType === "custom" && data.tiers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one custom tier is required",
        path: ["tiers"],
      });
    }
    if (data.ticketingType === "profile" && !data.selectedProfileId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ticket profile is required",
        path: ["selectedProfileId"],
      });
    }
  });
