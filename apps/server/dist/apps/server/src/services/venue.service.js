"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueService = void 0;
const slugify_1 = __importDefault(require("slugify"));
const Venue_model_1 = require("../models/Venue.model");
const error_middleware_1 = require("../middleware/error.middleware");
class VenueService {
    /**
     * List venues with optional search & city filters and paginated output
     */
    static async listVenues(filters) {
        const skip = (filters.page - 1) * filters.limit;
        const filter = {};
        if (filters.city) {
            filter['address.city'] = { $regex: filters.city, $options: 'i' };
        }
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        const [venues, total] = await Promise.all([
            Venue_model_1.Venue.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(filters.limit)
                .select('-__v')
                .lean(),
            Venue_model_1.Venue.countDocuments(filter),
        ]);
        return { venues, total };
    }
    /**
     * Get single venue by ID
     */
    static async getVenueById(id) {
        const venue = await Venue_model_1.Venue.findById(id);
        if (!venue) {
            throw error_middleware_1.AppError.notFound('Venue');
        }
        return venue;
    }
    /**
     * Create a new venue, auto-generating a unique slug if not provided
     */
    static async createVenue(data) {
        const slug = data.slug ?? (0, slugify_1.default)(data.name, { lower: true, strict: true });
        // Check slug collision
        const existing = await Venue_model_1.Venue.findOne({ slug });
        if (existing) {
            throw error_middleware_1.AppError.conflict(`Slug "${slug}" is already in use.`);
        }
        return await Venue_model_1.Venue.create({ ...data, slug });
    }
    /**
     * Update existing venue by ID
     */
    static async updateVenue(id, data) {
        if (data.slug) {
            const existing = await Venue_model_1.Venue.findOne({ slug: data.slug, _id: { $ne: id } });
            if (existing) {
                throw error_middleware_1.AppError.conflict(`Slug "${data.slug}" is already in use.`);
            }
        }
        const venue = await Venue_model_1.Venue.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        if (!venue) {
            throw error_middleware_1.AppError.notFound('Venue');
        }
        return venue;
    }
    /**
     * Delete venue by ID
     */
    static async deleteVenue(id) {
        const venue = await Venue_model_1.Venue.findByIdAndDelete(id);
        if (!venue) {
            throw error_middleware_1.AppError.notFound('Venue');
        }
    }
}
exports.VenueService = VenueService;
//# sourceMappingURL=venue.service.js.map