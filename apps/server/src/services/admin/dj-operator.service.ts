import { DJOperator, IDJOperator } from '../../models/dj-operator.schema';
import { CacheService } from '../cache.service';
import { safeDeleteImages } from './media-cleanup.service';

export const createDJOperator = async (data: Partial<IDJOperator>): Promise<IDJOperator> => {
  const dj = new DJOperator(data);
  const result = await dj.save();
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return result;
};

export const getDJOperators = async (page: number = 1, limit: number = 10): Promise<{ djs: IDJOperator[]; total: number; pages: number }> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;
  const total = await DJOperator.countDocuments({ isDeleted: { $ne: true } });
  const djs = await DJOperator.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit);
  return {
    djs,
    total,
    pages: Math.ceil(total / safeLimit),
  };
};

export const getDJOperatorById = async (id: string): Promise<IDJOperator | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  return await DJOperator.findById(cleanId);
};

export const updateDJOperator = async (id: string, data: Partial<IDJOperator>): Promise<IDJOperator | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  const existing = await DJOperator.findById(cleanId);
  if (!existing) return null;

  const oldProfileId = existing.profileImage?.publicId;
  const newProfileId = data.profileImage?.publicId;
  const profileReplaced = newProfileId && oldProfileId && oldProfileId !== newProfileId;

  const updated = await DJOperator.findByIdAndUpdate(cleanId, data, { new: true });
  if (updated) {
    if (profileReplaced && oldProfileId) {
      safeDeleteImages([oldProfileId], 'DJOperator', 'update');
    }
  }
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return updated;
};

export const deleteDJOperator = async (id: string): Promise<IDJOperator | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  const existing = await DJOperator.findById(cleanId);
  if (!existing) return null;

  const deleted = await DJOperator.findByIdAndUpdate(cleanId, { isDeleted: true, deletedAt: new Date() }, { new: true });
  if (deleted) {
    if (existing.profileImage?.publicId) {
      safeDeleteImages([existing.profileImage.publicId], 'DJOperator', 'delete');
    }
  }
  await CacheService.delPattern('dj-operators:*');
  await CacheService.delPattern('events:*');
  return deleted;
};
