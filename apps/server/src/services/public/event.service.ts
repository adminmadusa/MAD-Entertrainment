import jwt from 'jsonwebtoken';
import type { FilterQuery } from 'mongoose';

import { EventStatus, SeatStatus, deriveBookingEligibility } from '@mad/shared';

import { getEnv } from '../../config/env';
import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Event, IEvent } from '../../models/event.schema';
import { SeatLayout, ISeatLayout } from '../../models/seat-layout.schema';
import { auditLog } from '../../utils/audit';

export function verifyPreviewToken(token: string): {
  valid: boolean;
  eventId?: string;
  adminId?: string;
  expiresAt?: number;
} {
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_ADMIN_SECRET) as any;
    if (decoded && decoded.eventId && decoded.adminId) {
      return {
        valid: true,
        eventId: decoded.eventId,
        adminId: decoded.adminId,
        expiresAt: decoded.exp ? decoded.exp * 1000 : undefined,
      };
    }
  } catch (err) {
    // Suppress token verification errors and return invalid
  }
  return { valid: false };
}


export class PublicEventService {
  static async listEvents(filters: { category?: string; status?: string; search?: string; page?: number; limit?: number; includeTotal?: boolean }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IEvent> = {
      isDeleted: { $ne: true },
    };

    const now = new Date();

    if (filters.status) {
      if (filters.status === 'completed') {
        query.$or = [
          { endDate: { $lt: now } },
          { endDate: { $exists: false }, startDate: { $lt: now } },
          { endDate: null, startDate: { $lt: now } },
        ];
      } else if (filters.status === 'published' || filters.status === 'upcoming') {
        query.status = EventStatus.PUBLISHED;
        query.$or = [
          { endDate: { $gte: now } },
          { endDate: { $exists: false }, startDate: { $gte: now } },
          { endDate: null, startDate: { $gte: now } },
        ];
      } else {
        query.status = filters.status;
      }
    } else {
      // Default: Only show published and NOT completed (i.e. upcoming / live)
      query.status = EventStatus.PUBLISHED;
      query.$or = [
        { endDate: { $gte: now } },
        { endDate: { $exists: false }, startDate: { $gte: now } },
        { endDate: null, startDate: { $gte: now } },
      ];
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      const searchOr = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
      
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchOr }
        ];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const skipCount = filters.includeTotal === false;
    let events: Partial<IEvent>[];
    let total = 0;

    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    if (skipCount) {
      events = await Event.find(query, null, queryOptions)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .select('title slug description category bannerImage startDate endDate ticketTiers.price isSoldOut venue status')
        .lean<Partial<IEvent>[]>();
      total = events.length;
    } else {
      [events, total] = await Promise.all([
        Event.find(query, null, queryOptions)
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .select('title slug description category bannerImage startDate endDate ticketTiers.price isSoldOut venue status')
          .lean<Partial<IEvent>[]>(),
        Event.countDocuments(query, queryOptions),
      ]);
    }

    return {
      events: events.map(e => ({
        ...e,
        ...deriveBookingEligibility(e as any)
      })),
      total,
    } as any;
  }

  static async getEventBySlug(slug: string) {
    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    // Serve both PUBLISHED and COMPLETED events so the event detail page
    // remains accessible after an event has ended.
    const event = await Event.findOne(
      {
        slug,
        status: { $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
        isDeleted: { $ne: true },
      },
      null,
      queryOptions
    )
      .populate('djOperatorIds')
      .lean();

    if (!event) {
      throw AppError.notFound('Event');
    }

    if (event.ticketTiers) {
      event.ticketTiers = event.ticketTiers.filter(tier => tier.isDeleted !== true);
    }

    return {
      ...event,
      ...deriveBookingEligibility(event as any)
    } as any;
  }

  static async getEventSeatLayout(eventId: string) {
    const lockExpiryCutoff = new Date(Date.now() - 10 * 60 * 1000);
    await SeatLayout.updateOne(
      { eventId },
      {
        $set: {
          'seats.$[seat].status': SeatStatus.AVAILABLE,
          'seats.$[seat].lockedBy': undefined,
          'seats.$[seat].lockedAt': undefined,
          'seats.$[seat].bookedByBookingId': undefined,
        },
      },
      {
        arrayFilters: [
          {
            'seat.status': SeatStatus.LOCKED,
            'seat.lockedAt': { $lt: lockExpiryCutoff },
          },
        ],
      }
    );

    const layout = await SeatLayout.findOne({ eventId }).lean<ISeatLayout>();
    if (!layout) {
      throw AppError.notFound('Seat layout for this event');
    }

    // Merge live locks from Redis
    const redis = getRedis();
    const lockKeys = await redis.keys(`mad:lock:event:${eventId}:seat:*`);
    const activeLocks: Record<string, string> = {};

    if (lockKeys.length > 0) {
      const values = await redis.mget(...lockKeys);
      lockKeys.forEach((key, index) => {
        const parts = key.split(':');
        const seatId = parts[parts.length - 1];
        if (seatId && values[index]) {
          activeLocks[seatId] = values[index]!;
        }
      });
    }

    // Update statuses of seats that are currently locked in Redis
    const updatedSeats = layout.seats.map((seat) => {
      const lockHolder = activeLocks[seat.seatId];
      if (lockHolder && seat.status === SeatStatus.AVAILABLE) {
        return {
          ...seat,
          status: SeatStatus.LOCKED,
          lockedBy: lockHolder,
          lockedAt: new Date(), // Approximate lock time
        };
      }
      return seat;
    });

    return {
      ...layout,
      seats: updatedSeats,
    };
  }
}
