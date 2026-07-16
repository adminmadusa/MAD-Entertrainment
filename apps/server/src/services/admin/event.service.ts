import type { FilterQuery } from 'mongoose';

import { EventStatus, EVENT_STATUS_TRANSITIONS, type EventLifecycleStatus, type BulkOperationResult, EVENT_DUPLICATION_POLICY } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Event, IEvent } from '../../models/event.schema';
import { TicketProfile } from '../../models/ticket-profile.schema';
import { Ticket, ITicket } from '../../models/ticket.schema';
import { auditLog } from '../../utils/audit';
import { CacheService } from '../cache.service';
import { safeDeleteImages } from './media-cleanup.service';
import { resolveEventTickets } from './ticket-profile.service';

export const validateEventImagesPayload = (
  bannerImage?: { publicId?: string; hash?: string },
  posterImage?: { publicId?: string; hash?: string }
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

const INITIAL_EVENT_STATUSES: readonly EventStatus[] = [
  EventStatus.PUBLISHED,
];

export const assertInitialEventStatus = (status?: EventStatus): void => {
  if (!status) return;

  if (!INITIAL_EVENT_STATUSES.includes(status)) {
    throw AppError.conflict('Invalid initial event status');
  }
};

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
  validateEventImagesPayload(data.bannerImage, data.posterImage);
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
  filters: { search?: string; status?: string; sortField?: string; sortOrder?: 'asc' | 'desc' } = {}
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

  const SORT_FIELDS: Record<string, string> = {
    title: 'title',
    category: 'category',
    startDate: 'startDate',
    status: 'status',
    createdAt: 'createdAt'
  };
  const validSortField = filters.sortField ? (SORT_FIELDS[filters.sortField] ?? 'createdAt') : 'createdAt';
  const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;
  const sortOptions: any = { [validSortField]: sortDirection };
  if (validSortField !== 'createdAt') sortOptions.createdAt = -1;
  sortOptions._id = 1;

  const total = await Event.countDocuments(query);
  const events = await Event.find(query)
    .populate('djOperatorIds', 'name')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  return {
    events,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getEventById = async (id: string): Promise<EventWithAttendance | null> => {
  const event = await Event.findById(String(id))
    .populate('djOperatorIds', 'name');
  if (!event) return null;

  return {
    ...event.toObject(),
    ...(await getEventAttendanceMetrics(event)),
  };
};

export const updateEvent = async (id: string, data: Partial<IEvent>): Promise<EventWithAttendance | null> => {
  const existing = await Event.findById(String(id));
  if (!existing) return null;

  const rawExpectedVersion = data.eventVersion;
  if (rawExpectedVersion === undefined || rawExpectedVersion === null) {
    throw AppError.badRequest('Event version is required for update');
  }
  if (typeof rawExpectedVersion !== 'number' || !Number.isFinite(rawExpectedVersion) || !Number.isInteger(rawExpectedVersion)) {
    throw AppError.badRequest('Event version must be a valid integer');
  }
  const expectedVersion = rawExpectedVersion;

  const mergedBanner = data.bannerImage !== undefined ? data.bannerImage : existing.bannerImage;
  const mergedPoster = data.posterImage !== undefined ? data.posterImage : existing.posterImage;

  validateEventImagesPayload(mergedBanner, mergedPoster);

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

  if (data.totalCapacity !== undefined) {
    data.isSoldOut = data.totalCapacity > 0 && (existing.soldCount || 0) >= data.totalCapacity;
  }

  const oldBannerId = existing.bannerImage?.publicId;
  const newBannerId = data.bannerImage?.publicId;
  const bannerReplaced = newBannerId && oldBannerId && oldBannerId !== newBannerId;

  const oldPosterId = existing.posterImage?.publicId;
  const newPosterId = data.posterImage?.publicId;
  const posterReplaced = newPosterId && oldPosterId && oldPosterId !== newPosterId;

  const { eventVersion: _eventVersion, ...updateData } = data;
  const updated = await Event.findOneAndUpdate(
    { _id: String(id), eventVersion: expectedVersion },
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


  if (publicIdsToDelete.length > 0) {
    safeDeleteImages(publicIdsToDelete, 'Event', 'update');
  }


  return {
    ...updated.toObject(),
    ...(await getEventAttendanceMetrics(updated)),
  };
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  const bookingExists = await Booking.exists({ eventId: String(id) });
  if (bookingExists) {
    throw AppError.badRequest('Cannot delete event with existing bookings');
  }
  const existing = await Event.findById(String(id));
  if (!existing) return null;

  const deleted = await Event.findByIdAndUpdate(String(id), { isDeleted: true, deletedAt: new Date() }, { new: true });
  if (deleted) {
    const publicIdsToDelete: string[] = [];
    if (existing.bannerImage?.publicId) publicIdsToDelete.push(existing.bannerImage.publicId);
    if (existing.posterImage?.publicId) publicIdsToDelete.push(existing.posterImage.publicId);
    if (publicIdsToDelete.length > 0) {
      safeDeleteImages(publicIdsToDelete, 'Event', 'delete');
    }
  }
  await CacheService.delPattern('events:*');
  return deleted;
};

export interface DuplicateEventOptions {
  sourceEventId: string;
  title?: string;
  date?: string;
  venue?: string;
  publish?: boolean;
  adminId: string;
}

export const duplicateEvent = async (options: DuplicateEventOptions): Promise<IEvent> => {
  const { sourceEventId, title, date, venue, publish, adminId } = options;

  const originalEvent = await Event.findById(String(sourceEventId)).lean();
  if (!originalEvent) {
    throw AppError.notFound('Source event not found');
  }

  // Clone using policy
  const newEventData: Partial<IEvent> = {};
  
  EVENT_DUPLICATION_POLICY.copied.forEach((field) => {
    if (originalEvent[field as keyof typeof originalEvent] !== undefined) {
      // Deep clone to avoid reference issues (esp for arrays like ticketTiers, images)
      (newEventData as any)[field] = JSON.parse(JSON.stringify(originalEvent[field as keyof typeof originalEvent]));
    }
  });

  // Apply overrides
  newEventData.title = title || `${originalEvent.title} (Copy)`;
  if (date) {
    newEventData.startDate = new Date(date);
    // If original had endDate, try to maintain duration, otherwise leave unset or just don't copy
    if (originalEvent.endDate && originalEvent.startDate) {
      const duration = new Date(originalEvent.endDate).getTime() - new Date(originalEvent.startDate).getTime();
      newEventData.endDate = new Date(newEventData.startDate.getTime() + duration);
    }
  }
  if (venue) {
    newEventData.venue = venue;
  }

  newEventData.status = EventStatus.PUBLISHED;
  newEventData.slug = newEventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Ensure unique slug
  let slug = newEventData.slug.toLowerCase().trim();
  let isUnique = false;
  let count = 0;
  while (!isUnique) {
    const currentSlug = count === 0 ? slug : `${slug}-${count}`;
    const existing = await Event.findOne({ slug: currentSlug, isDeleted: { $ne: true } });
    if (!existing) {
      newEventData.slug = currentSlug;
      isUnique = true;
    } else {
      count++;
    }
  }

  // Reset ticket tier sold counts
  if (newEventData.ticketTiers) {
    newEventData.ticketTiers = newEventData.ticketTiers.map(tier => ({
      ...tier,
      soldCount: 0,
    }));
  }

  // Start transaction
  const session = await Event.startSession();
  session.startTransaction();
  try {
    const duplicatedEvent = new Event(newEventData);
    await duplicatedEvent.save({ session });

    auditLog({
      action: 'DUPLICATE_EVENT',
      actor: { type: 'admin', id: adminId },
      status: 'success',
      metadata: { 
        sourceEventId, 
        newEventId: duplicatedEvent._id,
        options
      },
    });

    await session.commitTransaction();
    session.endSession();

    await CacheService.delPattern('events:*');
    return duplicatedEvent;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    auditLog({
      action: 'DUPLICATE_EVENT',
      actor: { type: 'admin', id: adminId },
      status: 'failure',
      metadata: { 
        sourceEventId, 
        options,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
    });

    throw error;
  }
};

export const bulkDeleteEvents = async (ids: string[], adminId: string): Promise<BulkOperationResult> => {
  const results: BulkOperationResult['results'] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const id of ids) {
    try {
      const deleted = await deleteEvent(id);
      if (deleted) {
        results.push({ id, status: 'success' });
        successCount++;
      } else {
        results.push({ id, status: 'failed', reason: 'Event not found' });
        failedCount++;
      }
    } catch (error: any) {
      results.push({ id, status: 'failed', reason: error.message || 'Unknown error' });
      failedCount++;
    }
  }

  auditLog({
    action: 'BULK_DELETE_EVENTS',
    actor: { type: 'admin', id: adminId },
    status: 'success',
    metadata: { ids, successCount, failedCount, results },
  });

  return { successCount, failedCount, results };
};
