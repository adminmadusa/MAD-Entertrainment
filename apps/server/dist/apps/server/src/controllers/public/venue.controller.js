"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicVenues = listPublicVenues;
exports.getPublicVenueBySlug = getPublicVenueBySlug;
const venue_service_1 = require("../../services/public/venue.service");
const response_1 = require("../../utils/response");
async function listPublicVenues(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search, city } = req.query;
    const { venues, total } = await venue_service_1.PublicVenueService.listVenues({
        search,
        city,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, venues, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getPublicVenueBySlug(req, res) {
    const venue = await venue_service_1.PublicVenueService.getVenueBySlug(req.params.slug);
    (0, response_1.sendSuccess)(res, venue);
}
//# sourceMappingURL=venue.controller.js.map