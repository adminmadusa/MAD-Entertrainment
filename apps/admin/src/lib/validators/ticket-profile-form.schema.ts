import { z } from "zod";

export const ticketProfileTicketSchema = z.object({
  tier: z.string().min(1),
  name: z.string().trim().min(1, "Ticket name is required"),
  description: z.string(),
  price: z.union([z.number().min(0), z.literal("")]),
  isFree: z.boolean(),
  totalCapacity: z.union([z.number().min(1), z.literal("")]),
  minPerBooking: z.union([z.number().min(1), z.literal("")]),
  maxPerBooking: z.union([z.number().min(1), z.literal("")]),
  groupSize: z.union([z.number().min(1), z.literal("")]),
  discountType: z.enum(["percentage", "flat", "none"]),
  discountValue: z.union([z.number().min(0), z.literal("")]),
  minQtyRequired: z.union([z.number().min(1), z.literal("")]),
  buyQty: z.union([z.number().min(1), z.literal("")]),
  freeTicketQty: z.union([z.number().min(1), z.literal("")]),
  isActive: z.boolean(),
});

export const ticketProfileGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required"),
  slug: z.string(),
  description: z.string(),
  tickets: z
    .array(ticketProfileTicketSchema)
    .min(1, "Each group must contain at least one ticket"),
});

export const ticketProfileFormSchema = z.object({
  name: z.string().trim().min(1, "Profile name is required"),
  description: z.string(),
  groups: z
    .array(ticketProfileGroupSchema)
    .min(1, "At least one ticket group is required"),
});
