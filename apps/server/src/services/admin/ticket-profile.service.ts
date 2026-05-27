import {
  TicketProfile,
  ITicketProfile,
} from "../../models/ticket-profile.schema";
import { Event } from "../../models/event.schema";
import { CacheService } from "../cache.service";
import { Types } from "mongoose";

/**
 * Resolves event ticket tiers dynamically by merging profile tickets with event-specific overrides.
 * Auto-maps event title where "{eventName}" is specified and preserves existing sold counts.
 */
export const resolveEventTickets = (
  eventTitle: string,
  profile: ITicketProfile,
  overrides: any[] = [],
  existingTiers: any[] = [],
) => {
  const computedTiers: any[] = [];
  const overrideMap = new Map<string, any>();
  const existingSoldCountMap = new Map<string, number>();

  if (Array.isArray(existingTiers)) {
    existingTiers.forEach((tier) => {
      existingSoldCountMap.set(tier.tier, tier.soldCount || 0);
    });
  }

  if (Array.isArray(overrides)) {
    overrides.forEach((ov) => {
      overrideMap.set(ov.tier, ov);
    });
  }

  profile.groups.forEach((group) => {
    group.tickets.forEach((ticket) => {
      const override = overrideMap.get(ticket.tier);

      // Auto-map event title in ticket name
      const resolvedName = ticket.name.replace(/\{eventName\}/g, eventTitle);

      const price =
        override?.price !== undefined ? override.price : ticket.price;
      const totalCapacity =
        override?.totalCapacity !== undefined
          ? override.totalCapacity
          : ticket.totalCapacity;
      const isActive =
        override?.isActive !== undefined ? override.isActive : ticket.isActive;
      const maxPerBooking =
        override?.maxPerBooking !== undefined
          ? override.maxPerBooking
          : ticket.maxPerBooking;
      const minPerBooking =
        override?.minPerBooking !== undefined
          ? override.minPerBooking
          : ticket.minPerBooking;
      const soldCount = existingSoldCountMap.get(ticket.tier) || 0;

      computedTiers.push({
        tier: ticket.tier,
        name: resolvedName,
        slug: ticket.tier,
        price,
        totalCapacity,
        soldCount,
        groupSize: ticket.groupSize || 1,
        minPerBooking,
        maxPerBooking,
        description: ticket.description,
        isDeleted: false,
        isActive,
        groupId: group.slug,
        groupName: group.name,
        isFree: ticket.isFree || price === 0,
        offerRules: ticket.offerRules,
        availabilityWindow: ticket.availabilityWindow,
      });
    });
  });

  return computedTiers;
};

/**
 * Synchronizes updates from a ticket profile to all associated active events.
 */
export const syncProfileEvents = async (profileId: string) => {
  const profile = await TicketProfile.findById(profileId);
  if (!profile || profile.isDeleted) return;

  const events = await Event.find({
    ticketProfileId: profileId,
    status: { $in: ["draft", "published", "sold_out"] },
    isDeleted: { $ne: true },
  });

  for (const event of events) {
    const resolvedTiers = resolveEventTickets(
      event.title,
      profile,
      event.ticketOverrides || [],
      event.ticketTiers || [],
    );
    const totalCapacity = resolvedTiers.reduce(
      (acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0),
      0,
    );

    await Event.findByIdAndUpdate(event._id, {
      ticketTiers: resolvedTiers,
      totalCapacity,
      eventVersion: event.eventVersion + 1,
    });
  }
  await CacheService.delPattern("events:*");
};

export const createTicketProfile = async (
  data: Partial<ITicketProfile>,
): Promise<ITicketProfile> => {
  const profile = new TicketProfile(data);
  const result = await profile.save();
  return result;
};

export const getTicketProfiles = async (): Promise<ITicketProfile[]> => {
  return await TicketProfile.find({ isDeleted: { $ne: true } }).sort({
    createdAt: -1,
  });
};

export const getTicketProfileById = async (
  id: string,
): Promise<ITicketProfile | null> => {
  return await TicketProfile.findById(id);
};

export const updateTicketProfile = async (
  id: string,
  data: Partial<ITicketProfile>,
): Promise<ITicketProfile | null> => {
  const updated = await TicketProfile.findByIdAndUpdate(id, data, {
    new: true,
  });
  if (updated) {
    // Sync to all linked events in background
    syncProfileEvents(updated._id.toString()).catch((err) => {
      console.error(`Failed to sync profile ${id} with events:`, err);
    });
  }
  return updated;
};

export const deleteTicketProfile = async (
  id: string,
): Promise<ITicketProfile | null> => {
  const deleted = await TicketProfile.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  return deleted;
};
