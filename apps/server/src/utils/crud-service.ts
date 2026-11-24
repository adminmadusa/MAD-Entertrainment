import { Model, Document } from 'mongoose';

import { CacheService } from '../services/cache.service';

export function createCrudService<T extends Document>(
  model: Model<T>,
  cachePattern?: string,
  sortIndex: Record<string, 1 | -1> = { name: 1 }
) {
  const generateSlug = (name: string): string => {
    const raw = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (raw === 'early-bird') return 'early_bird';
    return raw;
  };

  return {
    create: async (data: Partial<T>): Promise<T> => {
      if ('name' in data && typeof data.name === 'string' && !('slug' in data)) {
        (data as any).slug = generateSlug(data.name);
      } else if ('slug' in data && (data as any).slug === 'early-bird') {
        (data as any).slug = 'early_bird';
      }
      const doc = new model(data);
      const result = await doc.save();
      if (cachePattern) {
        await CacheService.delPattern(cachePattern);
      }
      return result;
    },

    getAll: async (): Promise<T[]> => {
      return await model.find({ isDeleted: { $ne: true } }).sort(sortIndex);
    },

    update: async (id: string, data: Partial<T>): Promise<T | null> => {
      if ('name' in data && typeof data.name === 'string') {
        (data as any).slug = generateSlug(data.name);
      } else if ('slug' in data && (data as any).slug === 'early-bird') {
        (data as any).slug = 'early_bird';
      }
      const updated = await model.findByIdAndUpdate(id, data, { new: true });
      if (cachePattern) {
        await CacheService.delPattern(cachePattern);
      }
      return updated;
    },

    delete: async (id: string): Promise<T | null> => {
      const deleted = await model.findByIdAndUpdate(id, { isDeleted: true } as any, { new: true });
      if (cachePattern) {
        await CacheService.delPattern(cachePattern);
      }
      return deleted;
    }
  };
}
