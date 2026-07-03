import { EventStatus, SeatStatus, EventMemoryPublicationState } from '@mad/shared';
import type { FilterQuery } from 'mongoose';
import jwt from 'jsonwebtoken';

import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Event, IEvent } from '../../models/event.schema';
import { SeatLayout, ISeatLayout } from '../../models/seat-layout.schema';
import { getEnv } from '../../config/env';
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
  static async listEvents(filters: { category?: string; search?: string; page?: number; limit?: number; includeTotal?: boolean }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IEvent> = {
      status: EventStatus.PUBLISHED,
      isDeleted: { $ne: true },
    };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
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
        .select('title slug description category bannerImage startDate ticketTiers.price isSoldOut venue')
        .lean<Partial<IEvent>[]>();
      total = events.length;
    } else {
      [events, total] = await Promise.all([
        Event.find(query, null, queryOptions)
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .select('title slug description category bannerImage startDate ticketTiers.price isSoldOut venue')
          .lean<Partial<IEvent>[]>(),
        Event.countDocuments(query, queryOptions),
      ]);
    }

    return { events, total };
  }

  static async getEventBySlug(slug: string, previewToken?: string) {
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

    let isPreviewValid = false;
    if (previewToken) {
      const decoded = verifyPreviewToken(previewToken);
      if (decoded.valid && decoded.eventId && String(decoded.eventId) === String(event._id)) {
        isPreviewValid = true;

        // Audit preview accessed (only after token is valid and event matches)
        auditLog({
          action: 'event.memories.preview.accessed',
          status: 'success',
          metadata: {
            eventId: String(event._id),
            adminId: decoded.adminId,
            timestamp: new Date().toISOString(),
          },
          description: `Preview token accessed for event ${event._id} by admin ${decoded.adminId}`,
        });
      }
    }

    // Suppress memories from the public response unless they are actively PUBLISHED or a valid preview token is provided.
    // DRAFT, PREVIEW, and HIDDEN states must never reach public consumers.
    if (
      event.memories &&
      event.memories.publicationState !== EventMemoryPublicationState.PUBLISHED &&
      !isPreviewValid
    ) {
      event.memories = null;
    }

    return event;
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
