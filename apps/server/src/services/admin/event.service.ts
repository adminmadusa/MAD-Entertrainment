import { Event, IEvent } from '../../models/event.schema';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { Ticket } from '../../models/ticket.schema';
import { resolveEventTickets } from './ticket-profile.service';
import { CacheService } from '../cache.service';

export const createEvent = async (data: Partial<IEvent>): Promise<IEvent> => {
  if (data.title && !data.slug) {
    data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  
  if (data.slug) {
    let slug = data.slug.toLowerCase().trim();
    let isUnique = false;
    let count = 0;
    while (!isUnique) {
      const currentSlug = count === 0 ? slug : `${slug}-${count}`;
      const existing = await Event.findOne({ slug: currentSlug, isDeleted: { $ne: true } });
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
        data.title || '',
        profile,
        data.ticketOverrides || [],
        []
      );
      data.ticketTiers = resolvedTiers;
      data.totalCapacity = resolvedTiers.reduce((acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0), 0);
    }
  }

  const event = new Event(data);
  const result = await event.save();
  await CacheService.delPattern('events:*');
  return result;
};

export const getEvents = async (page: number = 1, limit: number = 10): Promise<{ events: IEvent[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isDeleted: { $ne: true } });
  const events = await Event.find({ isDeleted: { $ne: true } })
    .populate('djOperatorIds', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  return {
    events,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getEventById = async (id: string): Promise<any | null> => {
  const event = await Event.findById(id)
    .populate('djOperatorIds', 'name');
  if (!event) return null;

  const ticketsList = await Ticket.find({ eventId: event._id }).lean();
  const ticketsSold = event.soldCount || 0;
  const ticketsCheckedIn = ticketsList
    .filter((t: any) => t.scannedAt !== undefined && t.scannedAt !== null)
    .reduce((sum: number, t: any) => sum + (t.admits || 1), 0);
  const ticketsRemaining = Math.max(0, ticketsSold - ticketsCheckedIn);

  const attendancePercentage = ticketsSold > 0 ? Number(((ticketsCheckedIn / ticketsSold) * 100).toFixed(2)) : 0;
  const noShowCount = ticketsRemaining;
  const noShowPercentage = ticketsSold > 0 ? Number(((noShowCount / ticketsSold) * 100).toFixed(2)) : 0;

  return {
    ...event.toObject(),
    ticketsSold,
    ticketsCheckedIn,
    ticketsRemaining,
    attendancePercentage,
    noShowCount,
    noShowPercentage
  };
};

export const updateEvent = async (id: string, data: Partial<IEvent>): Promise<any | null> => {
  const existing = await Event.findById(id);
  if (!existing) return null;

  const profileId = data.ticketProfileId !== undefined ? data.ticketProfileId : existing.ticketProfileId;
  if (profileId) {
    const profile = await TicketProfile.findById(profileId);
    if (profile) {
      const overrides = data.ticketOverrides !== undefined ? data.ticketOverrides : existing.ticketOverrides;
      const resolvedTiers = resolveEventTickets(
        data.title || existing.title,
        profile,
        overrides || [],
        existing.ticketTiers || []
      );
      data.ticketTiers = resolvedTiers;
      data.totalCapacity = resolvedTiers.reduce((acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0), 0);
    }
  }

  const updated = await Event.findByIdAndUpdate(id, { ...data, eventVersion: existing.eventVersion + 1 }, { new: true });
  if (!updated) return null;
  await CacheService.delPattern('events:*');

  const ticketsList = await Ticket.find({ eventId: updated._id }).lean();
  const ticketsSold = updated.soldCount || 0;
  const ticketsCheckedIn = ticketsList
    .filter((t: any) => t.scannedAt !== undefined && t.scannedAt !== null)
    .reduce((sum: number, t: any) => sum + (t.admits || 1), 0);
  const ticketsRemaining = Math.max(0, ticketsSold - ticketsCheckedIn);

  const attendancePercentage = ticketsSold > 0 ? Number(((ticketsCheckedIn / ticketsSold) * 100).toFixed(2)) : 0;
  const noShowCount = ticketsRemaining;
  const noShowPercentage = ticketsSold > 0 ? Number(((noShowCount / ticketsSold) * 100).toFixed(2)) : 0;

  return {
    ...updated.toObject(),
    ticketsSold,
    ticketsCheckedIn,
    ticketsRemaining,
    attendancePercentage,
    noShowCount,
    noShowPercentage
  };
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  const deleted = await Event.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  await CacheService.delPattern('events:*');
  return deleted;
};

