"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistService = void 0;
const slugify_1 = __importDefault(require("slugify"));
const Artist_model_1 = require("../models/Artist.model");
const error_middleware_1 = require("../middleware/error.middleware");
class ArtistService {
    static async listArtists(filters) {
        const skip = (filters.page - 1) * filters.limit;
        const filter = {};
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        const [artists, total] = await Promise.all([
            Artist_model_1.Artist.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(filters.limit)
                .select('-__v')
                .lean(),
            Artist_model_1.Artist.countDocuments(filter),
        ]);
        return { artists, total };
    }
    static async getArtistById(id) {
        const artist = await Artist_model_1.Artist.findById(id);
        if (!artist) {
            throw error_middleware_1.AppError.notFound('Artist');
        }
        return artist;
    }
    static async createArtist(data) {
        const slug = data.slug ?? (0, slugify_1.default)(data.name, { lower: true, strict: true });
        const existing = await Artist_model_1.Artist.findOne({ slug });
        if (existing) {
            throw error_middleware_1.AppError.conflict(`Slug "${slug}" is already in use.`);
        }
        return await Artist_model_1.Artist.create({ ...data, slug });
    }
    static async updateArtist(id, data) {
        if (data.slug) {
            const existing = await Artist_model_1.Artist.findOne({ slug: data.slug, _id: { $ne: id } });
            if (existing) {
                throw error_middleware_1.AppError.conflict(`Slug "${data.slug}" is already in use.`);
            }
        }
        const artist = await Artist_model_1.Artist.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        if (!artist) {
            throw error_middleware_1.AppError.notFound('Artist');
        }
        return artist;
    }
    static async deleteArtist(id) {
        const artist = await Artist_model_1.Artist.findByIdAndDelete(id);
        if (!artist) {
            throw error_middleware_1.AppError.notFound('Artist');
        }
    }
}
exports.ArtistService = ArtistService;
//# sourceMappingURL=artist.service.js.map