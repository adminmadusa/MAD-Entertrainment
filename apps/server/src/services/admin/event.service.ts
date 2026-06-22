import { EventStatus, EVENT_STATUS_TRANSITIONS, type EventLifecycleStatus } from '@mad/shared';
import type { FilterQuery } from 'mongoose';

import { Event, IEvent } from '../../models/event.schema';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { Ticket, ITicket } from '../../models/ticket.schema';
import { resolveEventTickets } from './ticket-profile.service';
import { CacheService } from '../cache.service';
import { Booking } from '../../models/booking.schema';
import { AppError } from '../../middleware/error.middleware';
import { safeDeleteImages } from './media-cleanup.service';

export const validateEventImagesPayload = (
  bannerImage?: { publicId?: string; hash?: string },
  posterImage?: { publicId?: string; hash?: string },
  galleryImages?: { publicId?: string; hash?: string }[]
): void => {
  const seenPublicIds = new Set<string>();
  const seenHashes = new Set<string>();

  const check = (img?: { publicId?: string; hash?: string }) => {
    if (!img) return;
    if (img.publicId) {
      if (seenPublicIds.has(img.publicId)) {
        throw AppError.badRequest('Duplicate image detected');
      }
      seenPublicIds.add(img.publicId);
    }
    if (img.hash) {
      if (seenHashes.has(img.hash)) {
        throw AppError.badRequest('Duplicate image detected');
      }
      seenHashes.add(img.hash);
    }
  };

  check(bannerImage);
  check(posterImage);
  if (galleryImages && Array.isArray(galleryImages)) {
    const totalCount = (bannerImage ? 1 : 0) + (posterImage ? 1 : 0) + galleryImages.length;
    if (totalCount > 15) {
      throw AppError.badRequest('Total event images cannot exceed 15');
    }
    for (const img of galleryImages) {
      check(img);
    }
  }
};

export const assertEventStatusTransition = (
  currentStatus: EventStatus,
  nextStatus: EventStatus
): void => {
  if (currentStatus === nextStatus) return;

  if (!isEventLifecycleStatus(currentStatus) || !isEventLifecycleStatus(nextStatus)) {
    throw AppError.conflict('Invalid event status transition.');
  }

  const allowedTransitions = EVENT_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(nextStatus)) {
    throw AppError.conflict('Invalid event status transition.');
  }
};

const isEventLifecycleStatus = (status: EventStatus): status is EventLifecycleStatus =>
  Object.prototype.hasOwnProperty.call(EVENT_STATUS_TRANSITIONS, status);

<<<<<<< HEAD
const INITIAL_EVENT_STATUSES: readonly EventStatus[] = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
];

export const assertInitialEventStatus = (status?: EventStatus): void => {
  if (!status) return;

  if (!INITIAL_EVENT_STATUSES.includes(status)) {
    throw AppError.conflict('Invalid initial event status');
  }
};

=======
>>>>>>> origin/develop
type EventAttendanceMetrics = {
  ticketsSold: number;
  ticketsCheckedIn: number;
  ticketsRemaining: number;
  attendancePercentage: number;
  noShowCount: number;
  noShowPercentage: number;
};

type EventWithAttendance = ReturnType<IEvent['toObject']> & EventAttendanceMetrics;
const getEventAttendanceMetrics = async (event: IEvent): Promise<EventAttendanceMetrics> => {
  const ticketsList = await Ticket.find({ eventId: event._id }).lean<ITicket[]>();
  const ticketsSold = event.soldCount || 0;
  const ticketsCheckedIn = ticketsList
    .filter((ticket) => ticket.scannedAt !== undefined && ticket.scannedAt !== null)
    .reduce((sum, ticket) => sum + (ticket.admits || 1), 0);
  const ticketsRemaining = Math.max(0, ticketsSold - ticketsCheckedIn);

  const attendancePercentage = ticketsSold > 0 ? Number(((ticketsCheckedIn / ticketsSold) * 100).toFixed(2)) : 0;
  const noShowCount = ticketsRemaining;
  const noShowPercentage = ticketsSold > 0 ? Number(((noShowCount / ticketsSold) * 100).toFixed(2)) : 0;

  return {
    ticketsSold,
    ticketsCheckedIn,
    ticketsRemaining,
    attendancePercentage,
    noShowCount,
    noShowPercentage,
  };
};

export const createEvent = async (data: Partial<IEvent>): Promise<IEvent> => {
  validateEventImagesPayload(data.bannerImage, data.posterImage, data.galleryImages);
  assertInitialEventStatus(data.status);

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

export const getEvents = async (
  page: number = 1,
  limit: number = 10,
  filters: { search?: string; status?: string } = {}
): Promise<{ events: IEvent[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const query: FilterQuery<IEvent> = { isDeleted: { $ne: true } };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    // Escape regex metacharacters to prevent malformed search patterns
    const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
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

export const getEventById = async (id: string): Promise<EventWithAttendance | null> => {
  const event = await Event.findById(id)
    .populate('djOperatorIds', 'name');
  if (!event) return null;

  return {
    ...event.toObject(),
    ...(await getEventAttendanceMetrics(event)),
  };
};

export const updateEvent = async (id: string, data: Partial<IEvent>): Promise<EventWithAttendance | null> => {
  const existing = await Event.findById(id);
  if (!existing) return null;

  const expectedVersion = data.eventVersion;
  if (expectedVersion === undefined || expectedVersion === null) {
    throw AppError.badRequest('Event version is required for update');
  }

  const mergedBanner = data.bannerImage !== undefined ? data.bannerImage : existing.bannerImage;
  const mergedPoster = data.posterImage !== undefined ? data.posterImage : existing.posterImage;
  const mergedGallery = data.galleryImages !== undefined ? data.galleryImages : existing.galleryImages;

  validateEventImagesPayload(mergedBanner, mergedPoster, mergedGallery);

  if (data.status !== undefined) {
    assertEventStatusTransition(existing.status, data.status);
  }

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

  // Capacity Floor Protection check
  const finalTiers = data.ticketTiers !== undefined ? data.ticketTiers : existing.ticketTiers;
  if (finalTiers) {
    for (const tier of finalTiers) {
      const existingTier = existing.ticketTiers.find((t) => t.tier === tier.tier);
      const soldCount = existingTier ? existingTier.soldCount : 0;
      if (tier.totalCapacity < soldCount) {
        throw AppError.badRequest(
          `Cannot reduce capacity for tier "${tier.name}" below its sold count. Sold: ${soldCount}, Requested: ${tier.totalCapacity}`
        );
      }
    }
  }

  const oldBannerId = existing.bannerImage?.publicId;
  const newBannerId = data.bannerImage?.publicId;
  const bannerReplaced = newBannerId && oldBannerId && oldBannerId !== newBannerId;

  const oldPosterId = existing.posterImage?.publicId;
  const newPosterId = data.posterImage?.publicId;
  const posterReplaced = newPosterId && oldPosterId && oldPosterId !== newPosterId;

  const oldGalleryIds = existing.galleryImages?.map((img) => img.publicId) || [];
  const newGalleryIds = data.galleryImages?.map((img) => img.publicId) || [];
  const removedGalleryIds = oldGalleryIds.filter((id) => id && !newGalleryIds.includes(id));

  const { eventVersion: _eventVersion, ...updateData } = data;
  const updated = await Event.findOneAndUpdate(
    { _id: id, eventVersion: expectedVersion },
    { $set: updateData, $inc: { eventVersion: 1 } },
    { new: true }
  );
  if (!updated) {
    throw AppError.conflict('Event has been modified by another process. Please refresh and try again.');
  }
  await CacheService.delPattern('events:*');

  const publicIdsToDelete: string[] = [];
  if (bannerReplaced && oldBannerId) publicIdsToDelete.push(oldBannerId);
  if (posterReplaced && oldPosterId) publicIdsToDelete.push(oldPosterId);
  if (removedGalleryIds.length > 0) publicIdsToDelete.push(...removedGalleryIds);

  if (publicIdsToDelete.length > 0) {
    safeDeleteImages(publicIdsToDelete, 'Event', 'update');
  }

  return {
    ...updated.toObject(),
    ...(await getEventAttendanceMetrics(updated)),
  };
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  const bookingExists = await Booking.exists({ eventId: id });
  if (bookingExists) {
    throw AppError.badRequest('Cannot delete event with existing bookings');
  }
  const existing = await Event.findById(id);
  if (!existing) return null;

  const deleted = await Event.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  if (deleted) {
    const publicIdsToDelete: string[] = [];
    if (existing.bannerImage?.publicId) publicIdsToDelete.push(existing.bannerImage.publicId);
    if (existing.posterImage?.publicId) publicIdsToDelete.push(existing.posterImage.publicId);
    if (existing.galleryImages) {
      for (const img of existing.galleryImages) {
        if (img.publicId) publicIdsToDelete.push(img.publicId);
      }
    }
    if (publicIdsToDelete.length > 0) {
      safeDeleteImages(publicIdsToDelete, 'Event', 'delete');
    }
  }
  await CacheService.delPattern('events:*');
  return deleted;
};
