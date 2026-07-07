import { Tier, ITier } from '../../models/tier.schema';
import { CacheService } from '../cache.service';

export const createTier = async (data: Partial<ITier>): Promise<ITier> => {
  if (data.name) {
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  const tier = new Tier(data);
  const result = await tier.save();
  await CacheService.delPattern('events:*');
  return result;
};

export const getTiers = async (): Promise<ITier[]> => {
  return await Tier.find({ isDeleted: { $ne: true } }).sort({ sortIndex: 1, name: 1 });
};

export const updateTier = async (id: string, data: Partial<ITier>): Promise<ITier | null> => {
  if (data.name) {
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  const updated = await Tier.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern('events:*');
  return updated;
};

export const deleteTier = async (id: string): Promise<ITier | null> => {
  const deleted = await Tier.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  await CacheService.delPattern('events:*');
  return deleted;
};
