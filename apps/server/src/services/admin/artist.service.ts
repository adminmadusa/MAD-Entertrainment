import { Artist, IArtist } from '../../models/artist.schema';
import { CacheService } from '../cache.service';

export const createArtist = async (data: Partial<IArtist>): Promise<IArtist> => {
  const artist = new Artist(data);
  const result = await artist.save();
  await CacheService.delPattern('artists:*');
  return result;
};

export const getArtists = async (page: number = 1, limit: number = 10): Promise<{ artists: IArtist[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Artist.countDocuments({ isDeleted: { $ne: true } });
  const artists = await Artist.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return {
    artists,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getArtistById = async (id: string): Promise<IArtist | null> => {
  return await Artist.findById(id);
};

export const updateArtist = async (id: string, data: Partial<IArtist>): Promise<IArtist | null> => {
  const updated = await Artist.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern('artists:*');
  return updated;
};

export const deleteArtist = async (id: string): Promise<IArtist | null> => {
  const deleted = await Artist.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  await CacheService.delPattern('artists:*');
  return deleted;
};
