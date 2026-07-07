import { AppError } from '../../middleware/error.middleware';
import { DJOperator } from '../../models/dj-operator.schema';

export class PublicDJOperatorService {
  static async listDJOperators(filters: { search?: string; page?: number; limit?: number; includeTotal?: boolean }) {
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

    const skipCount = filters.includeTotal === false;
    let djOperators: any[];
    let total = 0;

    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    if (skipCount) {
      djOperators = await DJOperator.find(query, null, queryOptions)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .select('name slug bio specialties profileImage isActive')
        .lean();
      total = djOperators.length;
    } else {
      [djOperators, total] = await Promise.all([
        DJOperator.find(query, null, queryOptions)
          .sort({ name: 1 })
          .skip(skip)
          .limit(limit)
          .select('name slug bio specialties profileImage isActive')
          .lean(),
        DJOperator.countDocuments(query, queryOptions),
      ]);
    }

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
    // 5-second query timeout to prevent Safari streaming stalls
    const queryOptions = { maxTimeMS: 5000 };

    const djOperator = await DJOperator.findOne({ slug, isActive: true }, null, queryOptions)
      .select('-__v')
      .lean();

    if (!djOperator) {
      throw AppError.notFound('DJ Operator');
    }

    return djOperator;
  }
}
