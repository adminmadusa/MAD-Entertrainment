import { Venue, IVenue } from '../../models/venue.schema';

export const createVenue = async (data: Partial<IVenue>): Promise<IVenue> => {
  const venue = new Venue(data);
  return await venue.save();
};

export const getVenues = async (page: number = 1, limit: number = 10): Promise<{ venues: IVenue[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Venue.countDocuments();
  const venues = await Venue.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
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
  return await Venue.findByIdAndUpdate(id, data, { new: true });
};

export const deleteVenue = async (id: string): Promise<IVenue | null> => {
  return await Venue.findByIdAndDelete(id);
};
