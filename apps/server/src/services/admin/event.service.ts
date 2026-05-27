import { Event, IEvent } from "../../models/event.schema";
import { TicketProfile } from "../../models/ticket-profile.schema";
import { resolveEventTickets } from "./ticket-profile.service";
import { CacheService } from "../cache.service";

export const createEvent = async (data: Partial<IEvent>): Promise<IEvent> => {
  if (data.title && !data.slug) {
    data.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  if (data.slug) {
    let slug = data.slug.toLowerCase().trim();
    let isUnique = false;
    let count = 0;
    while (!isUnique) {
      const currentSlug = count === 0 ? slug : `${slug}-${count}`;
      const existing = await Event.findOne({
        slug: currentSlug,
        isDeleted: { $ne: true },
      });
      if (!existing) {
        data.slug = currentSlug;
        isUnique = true;
      } else {
        count++;
      }
    }
  }

  if (data.ticketProfileId) {
    const profile = await TicketProfile.findById(data.ticketProfileId);
    if (profile) {
      const resolvedTiers = resolveEventTickets(
        data.title || "",
        profile,
        data.ticketOverrides || [],
        [],
      );
      data.ticketTiers = resolvedTiers;
      data.totalCapacity = resolvedTiers.reduce(
        (acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0),
        0,
      );
    }
  }

  const event = new Event(data);
  const result = await event.save();
  await CacheService.delPattern("events:*");
  return result;
};

export const getEvents = async (
  page: number = 1,
  limit: number = 10,
): Promise<{ events: IEvent[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isDeleted: { $ne: true } });
  const events = await Event.find({ isDeleted: { $ne: true } })
    .populate("artistIds", "name")
    .populate("djOperatorIds", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    events,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getEventById = async (id: string): Promise<IEvent | null> => {
  return await Event.findById(id)
    .populate("artistIds", "name")
    .populate("djOperatorIds", "name");
};

export const updateEvent = async (
  id: string,
  data: Partial<IEvent>,
): Promise<IEvent | null> => {
  const existing = await Event.findById(id);
  if (!existing) return null;

  const profileId =
    data.ticketProfileId !== undefined
      ? data.ticketProfileId
      : existing.ticketProfileId;
  if (profileId) {
    const profile = await TicketProfile.findById(profileId);
    if (profile) {
      const overrides =
        data.ticketOverrides !== undefined
          ? data.ticketOverrides
          : existing.ticketOverrides;
      const resolvedTiers = resolveEventTickets(
        data.title || existing.title,
        profile,
        overrides || [],
        existing.ticketTiers || [],
      );
      data.ticketTiers = resolvedTiers;
      data.totalCapacity = resolvedTiers.reduce(
        (acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0),
        0,
      );
    }
  }

  const updated = await Event.findByIdAndUpdate(
    id,
    { ...data, eventVersion: existing.eventVersion + 1 },
    { new: true },
  );
  await CacheService.delPattern("events:*");
  return updated;
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  const deleted = await Event.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );
  await CacheService.delPattern("events:*");
  return deleted;
};
