import { z } from "zod";

const intFromTransport = (min: number) => z.coerce.number().int().min(min);

const normalizedString = z.string().trim();
const ticketTierSchema = z.enum([
  "general",
  "silver",
  "gold",
  "vip",
  "vvip",
  "platinum",
  "backstage",
  "couple",
  "group",
  "family",
  "early_bird",
  "custom",
]);

const TicketOfferRulesSchema = z
  .object({
    discountType: z.enum(["percentage", "flat", "none"]),
    discountValue: z.coerce.number().min(0).default(0),
    minQtyRequired: intFromTransport(1).default(1),
    buyQty: intFromTransport(1).optional(),
    freeTicketQty: intFromTransport(1).optional(),
  })
  .transform((rules) => {
    if (rules.discountType === "none") {
      return undefined;
    }
    return rules;
  });

const TicketAvailabilityWindowSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const TicketConfigSchema = z
  .object({
    tier: ticketTierSchema,
    name: normalizedString.min(1),
    description: normalizedString.optional(),
    price: z.coerce.number().min(0),
    isFree: z.boolean().default(false),
    totalCapacity: intFromTransport(1),
    minPerBooking: intFromTransport(1).default(1),
    maxPerBooking: intFromTransport(1).default(10),
    groupSize: intFromTransport(1).default(1),
    availabilityWindow: TicketAvailabilityWindowSchema.optional(),
    offerRules: TicketOfferRulesSchema.optional(),
    isActive: z.boolean().default(true),
  })
  .transform((ticket) => ({
    ...ticket,
    description:
      ticket.description && ticket.description.length > 0
        ? ticket.description
        : undefined,
    price: ticket.isFree ? 0 : ticket.price,
  }));

const TicketGroupSchema = z
  .object({
    name: normalizedString.min(1),
    slug: normalizedString.min(1),
    description: normalizedString.optional(),
    tickets: z.array(TicketConfigSchema).default([]),
  })
  .transform((group) => ({
    ...group,
    description:
      group.description && group.description.length > 0
        ? group.description
        : undefined,
    tickets: group.tickets ?? [],
  }));

export const TicketProfileMutationSchema = z.object({
  name: normalizedString.min(1),
  description: normalizedString.optional(),
  groups: z.array(TicketGroupSchema).default([]),
  isActive: z.boolean().default(true),
});

export type TicketProfileMutationInput = z.infer<
  typeof TicketProfileMutationSchema
>;
