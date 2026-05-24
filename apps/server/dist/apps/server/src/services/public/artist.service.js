"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicArtistService = void 0;
const error_middleware_1 = require("../../middleware/error.middleware");
const artist_schema_1 = require("../../models/artist.schema");
class PublicArtistService {
    static async listArtists(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const skip = (page - 1) * limit;
        const filter = { isActive: true };
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        if (filters.genre) {
            filter['genre'] = { $in: [filters.genre] };
        }
        const [artists, total] = await Promise.all([
            artist_schema_1.Artist.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .select('-__v')
                .lean(),
            artist_schema_1.Artist.countDocuments(filter),
        ]);
        return { artists, total };
    }
    static async getArtistBySlug(slug) {
        const artist = await artist_schema_1.Artist.findOne({ slug, isActive: true })
            .select('-__v')
            .lean();
        if (!artist) {
            throw error_middleware_1.AppError.notFound('Artist');
        }
        return artist;
    }
}
exports.PublicArtistService = PublicArtistService;
//# sourceMappingURL=artist.service.js.map