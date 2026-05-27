import { TicketProfile } from "@mad/types";

import {
  TicketProfileFormValues,
  TicketProfileGroupFormValues,
  TicketProfileMutationPayload,
  TicketProfileTicketFormValues,
} from "@/types/ticket-profile-form";

export const defaultTicket = (): TicketProfileTicketFormValues => ({
  tier: "general",
  name: "General Admission",
  description: "",
  price: "",
  isFree: false,
  totalCapacity: "",
  minPerBooking: 1,
  maxPerBooking: 10,
  groupSize: 1,
  discountType: "none",
  discountValue: "",
  minQtyRequired: 1,
  buyQty: "",
  freeTicketQty: "",
  isActive: true,
});

export const defaultGroup = (): TicketProfileGroupFormValues => ({
  name: "General Passes",
  slug: "general-passes",
  description: "",
  tickets: [defaultTicket()],
});

export function getDefaultTicketProfileFormValues(): TicketProfileFormValues {
  return {
    name: "",
    description: "",
    groups: [defaultGroup()],
  };
}

export function mapTicketProfileToFormValues(
  profile: TicketProfile,
): TicketProfileFormValues {
  return {
    name: profile.name || "",
    description: profile.description || "",
    groups: (profile.groups || []).map((group) => ({
      name: group.name,
      slug: group.slug,
      description: group.description || "",
      tickets: (group.tickets || []).map((ticket) => {
        const rules = ticket.offerRules;
        return {
          tier: ticket.tier,
          name: ticket.name,
          description: ticket.description || "",
          price: ticket.price,
          isFree: !!ticket.isFree,
          totalCapacity: ticket.totalCapacity,
          minPerBooking: ticket.minPerBooking || 1,
          maxPerBooking: ticket.maxPerBooking || 10,
          groupSize: ticket.groupSize || 1,
          discountType: rules?.discountType || "none",
          discountValue: rules?.discountValue || "",
          minQtyRequired: rules?.minQtyRequired || 1,
          buyQty: rules?.buyQty || "",
          freeTicketQty: rules?.freeTicketQty || "",
          isActive: ticket.isActive !== false,
        };
      }),
    })),
  };
}

export function mapTicketProfileFormToPayload(
  values: TicketProfileFormValues,
): TicketProfileMutationPayload {
  const groups = values.groups.map((group) => ({
    name: group.name.trim(),
    slug:
      group.slug.trim() || group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: group.description.trim() || undefined,
    tickets: group.tickets.map((ticket) => {
      const hasOffer = ticket.discountType !== "none";
      return {
        tier: ticket.tier,
        name: ticket.name.trim(),
        description: ticket.description.trim() || undefined,
        price: ticket.isFree ? 0 : Number(ticket.price || 0),
        isFree: ticket.isFree,
        totalCapacity: Number(ticket.totalCapacity || 100),
        minPerBooking: Number(ticket.minPerBooking || 1),
        maxPerBooking: Number(ticket.maxPerBooking || 10),
        groupSize: Number(ticket.groupSize || 1),
        isActive: ticket.isActive,
        offerRules: hasOffer
          ? {
              discountType: ticket.discountType,
              discountValue: Number(ticket.discountValue || 0),
              minQtyRequired: Number(ticket.minQtyRequired || 1),
              buyQty: ticket.buyQty ? Number(ticket.buyQty) : undefined,
              freeTicketQty: ticket.freeTicketQty
                ? Number(ticket.freeTicketQty)
                : undefined,
            }
          : undefined,
      };
    }),
  }));

  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    groups,
  };
}
