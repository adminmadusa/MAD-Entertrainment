import { DJOperator, IDJOperator } from '../../models/dj-operator.schema';
import { CacheService } from '../cache.service';

export const createDJOperator = async (data: Partial<IDJOperator>): Promise<IDJOperator> => {
  const dj = new DJOperator(data);
  const result = await dj.save();
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return result;
};

export const getDJOperators = async (page: number = 1, limit: number = 10): Promise<{ djs: IDJOperator[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await DJOperator.countDocuments({ isDeleted: { $ne: true } });
  const djs = await DJOperator.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return {
    djs,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getDJOperatorById = async (id: string): Promise<IDJOperator | null> => {
  return await DJOperator.findById(id);
};

export const updateDJOperator = async (id: string, data: Partial<IDJOperator>): Promise<IDJOperator | null> => {
  const updated = await DJOperator.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return updated;
};

export const deleteDJOperator = async (id: string): Promise<IDJOperator | null> => {
  const deleted = await DJOperator.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return deleted;
};
