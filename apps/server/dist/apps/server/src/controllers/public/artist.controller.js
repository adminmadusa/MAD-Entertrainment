"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicArtists = listPublicArtists;
exports.getPublicArtistBySlug = getPublicArtistBySlug;
const artist_service_1 = require("../../services/public/artist.service");
const response_1 = require("../../utils/response");
async function listPublicArtists(req, res) {
    const { page, limit } = (0, response_1.parsePaginationParams)(req.query);
    const { search, genre } = req.query;
    const { artists, total } = await artist_service_1.PublicArtistService.listArtists({
        search,
        genre,
        page,
        limit,
    });
    (0, response_1.sendPaginated)(res, artists, (0, response_1.buildPaginationMeta)(total, page, limit));
}
async function getPublicArtistBySlug(req, res) {
    const artist = await artist_service_1.PublicArtistService.getArtistBySlug(req.params.slug);
    (0, response_1.sendSuccess)(res, artist);
}
//# sourceMappingURL=artist.controller.js.map