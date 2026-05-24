"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.getEventBySlug = getEventBySlug;
exports.getEventSeatLayout = getEventSeatLayout;
const event_service_1 = require("../../services/public/event.service");
const response_1 = require("../../utils/response");
async function listEvents(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { category, search } = req.query;
    const { events, total } = await event_service_1.PublicEventService.listEvents({
        category,
        search,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, events, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getEventBySlug(req, res) {
    const event = await event_service_1.PublicEventService.getEventBySlug(req.params.slug);
    (0, response_1.sendSuccess)(res, event);
}
async function getEventSeatLayout(req, res) {
    const layout = await event_service_1.PublicEventService.getEventSeatLayout(req.params.id);
    (0, response_1.sendSuccess)(res, layout);
}
//# sourceMappingURL=event.controller.js.map