import { Artist, IArtist } from '../../models/artist.schema';

export const createArtist = async (data: Partial<IArtist>): Promise<IArtist> => {
  const artist = new Artist(data);
  return await artist.save();
};

export const getArtists = async (page: number = 1, limit: number = 10): Promise<{ artists: IArtist[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Artist.countDocuments();
  const artists = await Artist.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
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
  return await Artist.findByIdAndUpdate(id, data, { new: true });
};

export const deleteArtist = async (id: string): Promise<IArtist | null> => {
  return await Artist.findByIdAndDelete(id);
};
