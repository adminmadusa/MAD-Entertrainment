"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVenues = listVenues;
exports.getVenue = getVenue;
exports.createVenue = createVenue;
exports.updateVenue = updateVenue;
exports.deleteVenue = deleteVenue;
const venue_service_1 = require("../../services/admin/venue.service");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
async function listVenues(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search, city } = req.query;
    const { venues, total } = await venue_service_1.VenueService.listVenues({
        search,
        city,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, venues, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getVenue(req, res) {
    const venue = await venue_service_1.VenueService.getVenueById(req.params.id);
    (0, response_1.sendSuccess)(res, venue);
}
async function createVenue(req, res) {
    const body = req.body;
    const venue = await venue_service_1.VenueService.createVenue(body);
    logger_1.logger.info({ venueId: venue._id }, 'Admin created venue via service');
    (0, response_1.sendCreated)(res, venue, 'Venue created successfully');
}
async function updateVenue(req, res) {
    const body = req.body;
    const venue = await venue_service_1.VenueService.updateVenue(req.params.id, body);
    logger_1.logger.info({ venueId: venue._id }, 'Admin updated venue via service');
    (0, response_1.sendSuccess)(res, venue, 'Venue updated successfully');
}
async function deleteVenue(req, res) {
    await venue_service_1.VenueService.deleteVenue(req.params.id);
    logger_1.logger.info({ venueId: req.params.id }, 'Admin deleted venue via service');
    (0, response_1.sendSuccess)(res, null, 'Venue deleted successfully');
}
//# sourceMappingURL=venue.controller.js.map