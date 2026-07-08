
import { EventStatus, type EventLifecycleStatus } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Event } from '../../models/event.schema';
import { Reservation } from '../../models/reservation.schema';
import { TicketProfile, ITicketProfile } from '../../models/ticket-profile.schema';
import { Ticket } from '../../models/ticket.schema';
import { CacheService } from '../cache.service';

const ACTIVE_PROFILE_EVENT_STATUSES: readonly EventLifecycleStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.POSTPONED,
];

/**
 * Resolves event ticket tiers dynamically by merging profile tickets with event-specific overrides.
 * Auto-maps event title where "{eventName}" is specified and preserves existing sold counts.
 */
export const resolveEventTickets = (
  eventTitle: string,
  profile: ITicketProfile,
  overrides: any[] = [],
  existingTiers: any[] = []
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

      const price = override?.price !== undefined ? override.price : ticket.price;
      const totalCapacity = override?.totalCapacity !== undefined ? override.totalCapacity : ticket.totalCapacity;
      const isActive = override?.isActive !== undefined ? override.isActive : ticket.isActive;
      const maxPerBooking = override?.maxPerBooking !== undefined ? override.maxPerBooking : ticket.maxPerBooking;
      const minPerBooking = override?.minPerBooking !== undefined ? override.minPerBooking : ticket.minPerBooking;
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
    status: { $in: ACTIVE_PROFILE_EVENT_STATUSES },
    isDeleted: { $ne: true },
  });

  // Step 1: Validate all events first (Atomicity)
  for (const event of events) {
    const resolvedTiers = resolveEventTickets(
      event.title,
      profile,
      event.ticketOverrides || [],
      event.ticketTiers || []
    );

    const currentTiers = (event.ticketTiers || []).map((t) => t.tier);
    const newTiers = resolvedTiers.map((t) => t.tier);
    const removedTiers = currentTiers.filter((t) => !newTiers.includes(t));

    for (const tier of removedTiers) {
      const eventTier = event.ticketTiers.find((t) => t.tier === tier);
      const soldCount = eventTier?.soldCount ?? 0;
      if (soldCount > 0) {
        throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with sold tickets.`);
      }

      const reservationExists = await Reservation.exists({ eventId: event._id, tier });
      if (reservationExists) {
        throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with active reservations.`);
      }

      const bookingExists = await Booking.exists({ eventId: event._id, 'tickets.tier': tier });
      if (bookingExists) {
        throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with active bookings.`);
      }

      const ticketExists = await Ticket.exists({ eventId: event._id, tier });
      if (ticketExists) {
        throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with generated tickets.`);
      }
    }
  }

  // Step 2: Apply updates only if all validations passed
  for (const event of events) {
    const resolvedTiers = resolveEventTickets(
      event.title,
      profile,
      event.ticketOverrides || [],
      event.ticketTiers || []
    );
    const totalCapacity = resolvedTiers.reduce((acc, tier) => acc + (tier.isActive ? tier.totalCapacity : 0), 0);

    const updated = await Event.findOneAndUpdate(
      { _id: event._id, eventVersion: event.eventVersion },
      {
        $set: {
          ticketTiers: resolvedTiers,
          totalCapacity,
        },
        $inc: {
          eventVersion: 1,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw AppError.conflict('Event was modified while synchronizing ticket profiles. Please retry.');
    }
  }
  await CacheService.delPattern('events:*');
};

export const createTicketProfile = async (data: Partial<ITicketProfile>): Promise<ITicketProfile> => {
  const profile = new TicketProfile(data);
  const result = await profile.save();
  return result;
};

export const getTicketProfiles = async (): Promise<ITicketProfile[]> => {
  return await TicketProfile.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

export const getTicketProfileById = async (id: string): Promise<ITicketProfile | null> => {
  return await TicketProfile.findById(id);
};

export const updateTicketProfile = async (
  id: string,
  data: Partial<ITicketProfile>
): Promise<ITicketProfile | null> => {
  const existingProfile = await TicketProfile.findById(id);
  if (!existingProfile) return null;

  if (data.groups) {
    const existingTiers = existingProfile.groups.flatMap((g) => g.tickets.map((t) => t.tier));
    const newTiers = data.groups.flatMap((g) => g.tickets.map((t) => t.tier));
    const removedTiers = existingTiers.filter((t) => !newTiers.includes(t));

    if (removedTiers.length > 0) {
      const events = await Event.find({
        ticketProfileId: id,
        status: { $in: ACTIVE_PROFILE_EVENT_STATUSES },
        isDeleted: { $ne: true },
      });

      for (const event of events) {
        for (const tier of removedTiers) {
          const eventTier = event.ticketTiers.find((t) => t.tier === tier);
          const soldCount = eventTier?.soldCount ?? 0;
          if (soldCount > 0) {
            throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with sold tickets.`);
          }

          const reservationExists = await Reservation.exists({ eventId: event._id, tier });
          if (reservationExists) {
            throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with active reservations.`);
          }

          const bookingExists = await Booking.exists({ eventId: event._id, 'tickets.tier': tier });
          if (bookingExists) {
            throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with active bookings.`);
          }

          const ticketExists = await Ticket.exists({ eventId: event._id, tier });
          if (ticketExists) {
            throw AppError.badRequest(`Cannot remove active ticket tier "${tier}" with generated tickets.`);
          }
        }
      }
    }
  }

  const updated = await TicketProfile.findByIdAndUpdate(id, data, { new: true });
  if (updated) {
    await syncProfileEvents(updated._id.toString());
  }
  return updated;
};

const DELETE_BLOCKED_MESSAGE = 'Ticket Profile is referenced by active events and cannot be deleted';

const ensureTicketProfileCanBeDeleted = async (profileId: string) => {
  const referencedEvents = await Event.find({
    ticketProfileId: profileId,
    isDeleted: { $ne: true },
  });

  if (referencedEvents.length === 0) return;

  const now = new Date();
  const activeEvents = referencedEvents.filter((event: any) => ACTIVE_PROFILE_EVENT_STATUSES.includes(event.status));
  const futureEvents = referencedEvents.filter((event: any) => event.startDate && new Date(event.startDate) > now);
  const eventsWithSoldTickets = referencedEvents.filter((event: any) => {
    const eventSoldCount = event.soldCount ?? 0;
    const tierSoldCount = Array.isArray(event.ticketTiers)
      ? event.ticketTiers.reduce((sum: number, tier: any) => sum + (tier.soldCount ?? 0), 0)
      : 0;
    return eventSoldCount > 0 || tierSoldCount > 0;
  });

  if (activeEvents.length > 0 || futureEvents.length > 0 || eventsWithSoldTickets.length > 0) {
    throw AppError.conflict(DELETE_BLOCKED_MESSAGE);
  }

  const eventIds = referencedEvents.map((event: any) => event._id);
  const [bookingExists, reservationExists, ticketExists] = await Promise.all([
    Booking.exists({ eventId: { $in: eventIds } }),
    Reservation.exists({ eventId: { $in: eventIds } }),
    Ticket.exists({ eventId: { $in: eventIds } }),
  ]);

  if (bookingExists || reservationExists || ticketExists) {
    throw AppError.conflict(DELETE_BLOCKED_MESSAGE);
  }
};

export const deleteTicketProfile = async (id: string): Promise<ITicketProfile | null> => {
  await ensureTicketProfileCanBeDeleted(id);
  const deleted = await TicketProfile.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  return deleted;
};
