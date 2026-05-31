import { EventStatus, SeatStatus } from '@mad/shared';

import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Event } from '../../models/event.schema';
import { SeatLayout, ISeatLayout } from '../../models/seat-layout.schema';


export class PublicEventService {
  static async listEvents(filters: { category?: string; search?: string; page?: number; limit?: number; includeTotal?: boolean }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
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
    let events: any[];
    let total = 0;

    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    if (skipCount) {
      events = await Event.find(query, null, queryOptions)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .select('title slug description category bannerImage startDate ticketTiers.price isSoldOut venue')
        .lean();
      total = events.length;
    } else {
      [events, total] = await Promise.all([
        Event.find(query, null, queryOptions)
          .sort({ startDate: 1 })
          .skip(skip)
          .limit(limit)
          .select('title slug description category bannerImage startDate ticketTiers.price isSoldOut venue')
          .lean(),
        Event.countDocuments(query, queryOptions),
      ]);
    }

    return { events, total };
  }

  static async getEventBySlug(slug: string) {
    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    const event = await Event.findOne({ slug, status: EventStatus.PUBLISHED, isDeleted: { $ne: true } }, null, queryOptions)
      .populate('djOperatorIds')
      .lean();

    if (!event) {
      throw AppError.notFound('Event');
    }

    if (event.ticketTiers) {
      event.ticketTiers = event.ticketTiers.filter(tier => tier.isDeleted !== true);
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
