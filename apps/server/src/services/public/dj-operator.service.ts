import { DJOperator } from '../../models/dj-operator.schema';
import { AppError } from '../../middleware/error.middleware';

export class PublicDJOperatorService {
  static async listDJOperators(filters: { search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { isActive: true };

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { bio: { $regex: filters.search, $options: 'i' } },
        { specialties: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [djOperators, total] = await Promise.all([
      DJOperator.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      DJOperator.countDocuments(query),
    ]);

    return {
      data: djOperators,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDJOperatorBySlug(slug: string) {
    const djOperator = await DJOperator.findOne({ slug, isActive: true })
      .select('-__v')
      .lean();

    if (!djOperator) {
      throw AppError.notFound('DJ Operator');
    }

    return djOperator;
  }
}
