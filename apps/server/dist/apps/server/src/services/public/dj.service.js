"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDJService = void 0;
const dj_operator_schema_1 = require("../../models/dj-operator.schema");
class PublicDJService {
    static async listDJs(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 12;
        const skip = (page - 1) * limit;
        const filter = {};
        if (filters.search) {
            filter['name'] = { $regex: filters.search, $options: 'i' };
        }
        const [djs, total] = await Promise.all([
            dj_operator_schema_1.DJOperator.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .select('-__v')
                .lean(),
            dj_operator_schema_1.DJOperator.countDocuments(filter),
        ]);
        return { djs, total };
    }
}
exports.PublicDJService = PublicDJService;
//# sourceMappingURL=dj.service.js.map