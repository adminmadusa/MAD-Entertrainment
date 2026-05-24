"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicVenueService = void 0;
const error_middleware_1 = require("../../middleware/error.middleware");
const venue_schema_1 = require("../../models/venue.schema");
class PublicVenueService {
    static async listVenues(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const skip = (page - 1) * limit;
        // Only surface active venues to the public
        const filter = { isActive: true };
        if (filters.city) {
            filter['address.city'] = { $regex: filters.city, $options: 'i' };
        }
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        const [venues, total] = await Promise.all([
            venue_schema_1.Venue.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .select('-__v')
                .lean(),
            venue_schema_1.Venue.countDocuments(filter),
        ]);
        return { venues, total };
    }
    static async getVenueBySlug(slug) {
        const venue = await venue_schema_1.Venue.findOne({ slug, isActive: true })
            .select('-__v')
            .lean();
        if (!venue) {
            throw error_middleware_1.AppError.notFound('Venue');
        }
        return venue;
    }
}
exports.PublicVenueService = PublicVenueService;
//# sourceMappingURL=venue.service.js.map