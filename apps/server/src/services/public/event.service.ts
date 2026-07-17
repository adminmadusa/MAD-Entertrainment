import jwt from 'jsonwebtoken';
import { type FilterQuery, Types } from 'mongoose';

import { EventStatus, SeatStatus, deriveEventCapabilities } from '@mad/shared';
import { EventGallery } from '../../models/event-gallery.schema';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';

import { getEnv } from '../../config/env';
import { getRedis } from '../../config/redis';
import { AppError } from '../../middleware/error.middleware';
import { Event, IEvent } from '../../models/event.schema';
import { SeatLayout, ISeatLayout } from '../../models/seat-layout.schema';
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
  } catch (_err) {
    // Suppress token verification errors and return invalid
  }
  return { valid: false };
}


export class PublicEventService {
  static async listEvents(filters: {
    category?: string;
    state?: string;
    sort?: string;
    exclude?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeTotal?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;
    const state = filters.state || 'active';
    const now = new Date();

    const matchStage: FilterQuery<IEvent> = {
      isDeleted: { $ne: true }
    };

    if (filters.category) {
      matchStage.category = filters.category;
    }

    if (filters.exclude) {
      try {
        matchStage._id = { $ne: new Types.ObjectId(filters.exclude) };
      } catch (_err) {
        // Ignore invalid ObjectId
      }
    }

    if (filters.search) {
      matchStage.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (state === 'active') {
      matchStage.status = EventStatus.PUBLISHED;
    } else if (state === 'past' || state === 'completed') {
      matchStage.status = { $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] };
    } else {
      matchStage.status = { $in: [EventStatus.PUBLISHED, EventStatus.COMPLETED, EventStatus.POSTPONED] };
    }

    const durationMs = 4 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const thirtyDaysMs = 30 * oneDayMs;

    const sortWeightCond = filters.sort === 'recommended'
      ? {
          $cond: {
            if: { $eq: ["$lifecycle", "LIVE"] },
            then: 0,
            else: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$lifecycle", "UPCOMING"] },
                    { $lte: ["$startDate", new Date(now.getTime() + sevenDaysMs)] }
                  ]
                },
                then: 1,
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ["$lifecycle", "UPCOMING"] },
                        { $lte: ["$startDate", new Date(now.getTime() + thirtyDaysMs)] }
                      ]
                    },
                    then: 2,
                    else: {
                      $cond: {
                        if: { $eq: ["$lifecycle", "UPCOMING"] },
                        then: 3,
                        else: 4
                      }
                    }
                  }
                }
              }
            }
          }
        }
      : {
          $cond: {
            if: { $eq: ["$lifecycle", "LIVE"] },
            then: 0,
            else: {
              $cond: {
                if: { $eq: ["$lifecycle", "UPCOMING"] },
                then: 1,
                else: 2
              }
            }
          }
        };

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "eventgallerysettings",
          localField: "_id",
          foreignField: "eventId",
          as: "gallerySettings"
        }
      },
      {
        $lookup: {
          from: "eventgalleries",
          localField: "_id",
          foreignField: "eventId",
          as: "galleryItems"
        }
      },
      {
        $addFields: {
          galleryPublished: {
            $ifNull: [{ $arrayElemAt: ["$gallerySettings.published", 0] }, false]
          },
          galleryItemCount: { $size: "$galleryItems" },
          computedEndDate: {
            $ifNull: [
              "$endDate",
              {
                $ifNull: [
                  "$bookingEndDate",
                  { $add: ["$startDate", durationMs] }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          lifecycle: {
            $cond: {
              if: { $eq: ["$status", EventStatus.COMPLETED] },
              then: "COMPLETED",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $lte: ["$startDate", now] },
                      { $gte: ["$computedEndDate", now] }
                    ]
                  },
                  then: "LIVE",
                  else: {
                    $cond: {
                      if: { $gt: ["$startDate", now] },
                      then: "UPCOMING",
                      else: "COMPLETED"
                    }
                  }
                }
              }
            }
          }
        }
      }
    ];

    if (state === 'active') {
      pipeline.push({ $match: { lifecycle: "UPCOMING" } });
    } else if (state === 'past' || state === 'completed') {
      pipeline.push({ $match: { lifecycle: { $in: ["LIVE", "COMPLETED"] } } });
    }

    pipeline.push(
      { $addFields: { sortWeight: sortWeightCond } },
      { $sort: { sortWeight: 1, startDate: 1 } }
    );

    let events: any[] = [];
    let total = 0;

    const skipCount = filters.includeTotal === false;

    if (skipCount) {
      const pagedPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
      events = await Event.aggregate(pagedPipeline).exec();
      total = events.length;
    } else {
      const paginationPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
      const countPipeline = [...pipeline, { $count: "total" }];

      const [pagedEvents, countResult] = await Promise.all([
        Event.aggregate(paginationPipeline).exec(),
        Event.aggregate(countPipeline).exec()
      ]);

      events = pagedEvents;
      total = countResult[0]?.total || 0;
    }

    const mappedEvents = events.map((e: any) => {
      const totalCapacity = e.totalCapacity || e.ticketTiers?.reduce((acc: number, t: any) => acc + (t.totalCapacity || 0), 0) || 0;
      const ticketsSold = e.soldCount || e.ticketTiers?.reduce((acc: number, t: any) => acc + (t.soldCount || 0), 0) || 0;

      const caps = deriveEventCapabilities({
        status: e.status,
        startDate: e.startDate,
        endDate: e.endDate,
        bookingStartDate: e.bookingStartDate,
        bookingEndDate: e.bookingEndDate,
        isSoldOut: e.isSoldOut,
        totalCapacity,
        ticketsSold,
        galleryPublished: e.galleryPublished,
        galleryItemCount: e.galleryItemCount,
        isDeleted: e.isDeleted
      });

      return {
        ...e,
        lifecycle: caps.lifecycle,
        visibility: caps.visibility,
        booking: caps.booking,
        gallery: caps.gallery,
        capabilities: caps.capabilities
      };
    });

    return {
      events: mappedEvents,
      total
    };
  }

  static async getEventBySlug(slug: string) {
    const queryOptions = { maxTimeMS: 5000 };

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

    const [galleryItemCount, gallerySettings] = await Promise.all([
      EventGallery.countDocuments({ eventId: event._id }),
      EventGallerySettings.findOne({ eventId: event._id }).lean()
    ]);

    const totalCapacity = event.totalCapacity || event.ticketTiers?.reduce((acc, t) => acc + (t.totalCapacity || 0), 0) || 0;
    const ticketsSold = event.soldCount || event.ticketTiers?.reduce((acc, t) => acc + (t.soldCount || 0), 0) || 0;

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate,
      isSoldOut: event.isSoldOut,
      totalCapacity,
      ticketsSold,
      galleryPublished: gallerySettings ? gallerySettings.published : false,
      galleryItemCount,
      isDeleted: event.isDeleted
    });

    return {
      ...event,
      lifecycle: caps.lifecycle,
      visibility: caps.visibility,
      booking: caps.booking,
      gallery: caps.gallery,
      capabilities: caps.capabilities
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
