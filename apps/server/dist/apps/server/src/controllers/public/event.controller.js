"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.getEventBySlug = getEventBySlug;
exports.getEventSeatLayout = getEventSeatLayout;
const event_service_1 = require("../../services/public/event.service");
const cache_service_1 = require("../../services/cache.service");
const response_1 = require("../../utils/response");
async function listEvents(req, res, next) {
    try {
        const category = typeof req.query.category === 'string' ? req.query.category : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 12);
        const cacheKey = `events:list:${category || 'all'}:${search || 'none'}:${page}:${limit}`;
        const cached = await cache_service_1.CacheService.get(cacheKey);
        if (cached) {
            (0, response_1.sendSuccess)(res, cached, 'Events list retrieved (cached)');
            return;
        }
        const result = await event_service_1.PublicEventService.listEvents({ category, search, page, limit });
        // Cache for 60 seconds (1 minute)
        await cache_service_1.CacheService.set(cacheKey, result, 60);
        (0, response_1.sendSuccess)(res, result, 'Events list retrieved');
    }
    catch (err) {
        next(err);
    }
}
async function getEventBySlug(req, res, next) {
    try {
        const slug = req.params.slug;
        const cacheKey = `events:detail:slug:${slug}`;
        const cached = await cache_service_1.CacheService.get(cacheKey);
        if (cached) {
            (0, response_1.sendSuccess)(res, cached, 'Event details retrieved (cached)');
            return;
        }
        const event = await event_service_1.PublicEventService.getEventBySlug(slug);
        // Cache for 300 seconds (5 minutes)
        await cache_service_1.CacheService.set(cacheKey, event, 300);
        (0, response_1.sendSuccess)(res, event, 'Event details retrieved');
    }
    catch (err) {
        next(err);
    }
}
async function getEventSeatLayout(req, res, next) {
    try {
        const eventId = req.params.eventId;
        // Live seats changing frequently - query directly
        const layout = await event_service_1.PublicEventService.getEventSeatLayout(eventId);
        (0, response_1.sendSuccess)(res, layout, 'Seat layout retrieved');
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=event.controller.js.map