"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicEventService = void 0;
const Event_model_1 = require("../models/Event.model");
const SeatLayout_model_1 = require("../models/SeatLayout.model");
const error_middleware_1 = require("../middleware/error.middleware");
const redis_1 = require("../config/redis");
const shared_1 = require("@mad/shared");
class PublicEventService {
    static async listEvents(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const skip = (page - 1) * limit;
        const query = {
            status: shared_1.EventStatus.PUBLISHED,
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
            Event_model_1.Event.find(query)
                .sort({ startDate: 1 })
                .skip(skip)
                .limit(limit)
                .populate('venueId', 'name city state')
                .lean(),
            Event_model_1.Event.countDocuments(query),
        ]);
        return { events, total };
    }
    static async getEventBySlug(slug) {
        const event = await Event_model_1.Event.findOne({ slug, status: shared_1.EventStatus.PUBLISHED })
            .populate('venueId')
            .populate('artistIds')
            .populate('djOperatorIds')
            .lean();
        if (!event) {
            throw error_middleware_1.AppError.notFound('Event');
        }
        return event;
    }
    static async getEventSeatLayout(eventId) {
        const layout = await SeatLayout_model_1.SeatLayout.findOne({ eventId }).lean();
        if (!layout) {
            throw error_middleware_1.AppError.notFound('Seat layout for this event');
        }
        // Merge live locks from Redis
        const redis = (0, redis_1.getRedis)();
        const lockKeys = await redis.keys(`mad:lock:event:${eventId}:seat:*`);
        const activeLocks = {};
        if (lockKeys.length > 0) {
            const values = await redis.mget(...lockKeys);
            lockKeys.forEach((key, index) => {
                const parts = key.split(':');
                const seatId = parts[parts.length - 1];
                if (seatId && values[index]) {
                    activeLocks[seatId] = values[index];
                }
            });
        }
        // Update statuses of seats that are currently locked in Redis
        const updatedSeats = layout.seats.map((seat) => {
            const lockHolder = activeLocks[seat.seatId];
            if (lockHolder && seat.status === shared_1.SeatStatus.AVAILABLE) {
                return {
                    ...seat,
                    status: shared_1.SeatStatus.LOCKED,
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
exports.PublicEventService = PublicEventService;
//# sourceMappingURL=event.public.service.js.map