import { EventStatus, SeatStatus } from '@mad/shared';

import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Event } from '../../models/event.schema';
import { SeatLayout, ISeatLayout } from '../../models/seat-layout.schema';


export class PublicEventService {
  static async listEvents(filters: { category?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      status: EventStatus.PUBLISHED,
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

    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('venueId', 'name city state')
        .lean(),
      Event.countDocuments(query),
    ]);

    return { events, total };
  }

  static async getEventBySlug(slug: string) {
    const event = await Event.findOne({ slug, status: EventStatus.PUBLISHED })
      .populate('venueId')
      .populate('artistIds')
      .populate('djOperatorIds')
      .lean();

    if (!event) {
      throw AppError.notFound('Event');
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
