"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DJService = void 0;
const slugify_1 = __importDefault(require("slugify"));
const DJOperator_model_1 = require("../models/DJOperator.model");
const error_middleware_1 = require("../middleware/error.middleware");
class DJService {
    static async listDJs(filters) {
        const skip = (filters.page - 1) * filters.limit;
        const filter = {};
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        const [djs, total] = await Promise.all([
            DJOperator_model_1.DJOperator.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(filters.limit)
                .select('-__v')
                .lean(),
            DJOperator_model_1.DJOperator.countDocuments(filter),
        ]);
        return { djs, total };
    }
    static async getDJById(id) {
        const dj = await DJOperator_model_1.DJOperator.findById(id);
        if (!dj) {
            throw error_middleware_1.AppError.notFound('DJ Operator');
        }
        return dj;
    }
    static async createDJ(data) {
        const slug = data.slug ?? (0, slugify_1.default)(data.name, { lower: true, strict: true });
        const existing = await DJOperator_model_1.DJOperator.findOne({ slug });
        if (existing) {
            throw error_middleware_1.AppError.conflict(`Slug "${slug}" is already in use.`);
        }
        return await DJOperator_model_1.DJOperator.create({ ...data, slug });
    }
    static async updateDJ(id, data) {
        if (data.slug) {
            const existing = await DJOperator_model_1.DJOperator.findOne({ slug: data.slug, _id: { $ne: id } });
            if (existing) {
                throw error_middleware_1.AppError.conflict(`Slug "${data.slug}" is already in use.`);
            }
        }
        const dj = await DJOperator_model_1.DJOperator.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
        if (!dj) {
            throw error_middleware_1.AppError.notFound('DJ Operator');
        }
        return dj;
    }
    static async deleteDJ(id) {
        const dj = await DJOperator_model_1.DJOperator.findByIdAndDelete(id);
        if (!dj) {
            throw error_middleware_1.AppError.notFound('DJ Operator');
        }
    }
}
exports.DJService = DJService;
//# sourceMappingURL=dj.service.js.map