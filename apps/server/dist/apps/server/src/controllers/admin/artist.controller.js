"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listArtists = listArtists;
exports.getArtist = getArtist;
exports.createArtist = createArtist;
exports.updateArtist = updateArtist;
exports.deleteArtist = deleteArtist;
const artist_service_1 = require("../../services/admin/artist.service");
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
async function listArtists(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search } = req.query;
    const { artists, total } = await artist_service_1.ArtistService.listArtists({
        search,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, artists, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getArtist(req, res) {
    const artist = await artist_service_1.ArtistService.getArtistById(req.params.id);
    (0, response_1.sendSuccess)(res, artist);
}
async function createArtist(req, res) {
    const body = req.body;
    const artist = await artist_service_1.ArtistService.createArtist(body);
    logger_1.logger.info({ artistId: artist._id }, 'Admin created artist via service');
    (0, response_1.sendCreated)(res, artist, 'Artist created successfully');
}
async function updateArtist(req, res) {
    const body = req.body;
    const artist = await artist_service_1.ArtistService.updateArtist(req.params.id, body);
    logger_1.logger.info({ artistId: artist._id }, 'Admin updated artist via service');
    (0, response_1.sendSuccess)(res, artist, 'Artist updated successfully');
}
async function deleteArtist(req, res) {
    await artist_service_1.ArtistService.deleteArtist(req.params.id);
    logger_1.logger.info({ artistId: req.params.id }, 'Admin deleted artist via service');
    (0, response_1.sendSuccess)(res, null, 'Artist deleted successfully');
}
//# sourceMappingURL=artist.controller.js.map