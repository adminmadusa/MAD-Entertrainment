import { Venue, IVenue } from '../../models/venue.schema';
import { CacheService } from '../cache.service';

export const createVenue = async (data: Partial<IVenue>): Promise<IVenue> => {
  if (data.name) {
    const existing = await Venue.findOne({
      name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') },
      isDeleted: { $ne: true }
    });
    if (existing) {
      return existing;
    }
  }
  const venue = new Venue(data);
  const result = await venue.save();
  await CacheService.delPattern('venues:*');
  await CacheService.delPattern('events:*');
  return result;
};

export const getVenues = async (page: number = 1, limit: number = 10): Promise<{ venues: IVenue[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Venue.countDocuments({ isDeleted: { $ne: true } });
  const venues = await Venue.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return {
    venues,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getVenueById = async (id: string): Promise<IVenue | null> => {
  return await Venue.findById(id);
};

export const updateVenue = async (id: string, data: Partial<IVenue>): Promise<IVenue | null> => {
  const updated = await Venue.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern('venues:*');
  await CacheService.delPattern('events:*');
  return updated;
};

export const deleteVenue = async (id: string): Promise<IVenue | null> => {
  const deleted = await Venue.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  await CacheService.delPattern('venues:*');
  await CacheService.delPattern('events:*');
  return deleted;
};
