import { Event, IEvent } from '../../models/event.schema';
import { CacheService } from '../cache.service';

export const createEvent = async (data: Partial<IEvent>): Promise<IEvent> => {
  const event = new Event(data);
  const result = await event.save();
  await CacheService.delPattern('events:*');
  return result;
};

export const getEvents = async (page: number = 1, limit: number = 10): Promise<{ events: IEvent[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments({ isDeleted: { $ne: true } });
  // Populate related entities for admin view
  const events = await Event.find({ isDeleted: { $ne: true } })
    .populate('venueId', 'name city')
    .populate('artistIds', 'name')
    .populate('djOperatorIds', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  return {
    events,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const getEventById = async (id: string): Promise<IEvent | null> => {
  return await Event.findById(id)
    .populate('venueId', 'name city')
    .populate('artistIds', 'name')
    .populate('djOperatorIds', 'name');
};

export const updateEvent = async (id: string, data: Partial<IEvent>): Promise<IEvent | null> => {
  // If version tracking or complex logic is needed, handle it here
  if (data.ticketTiers) {
    // Optionally update eventVersion or handle tier updates carefully
  }
  const updated = await Event.findByIdAndUpdate(id, data, { new: true });
  await CacheService.delPattern('events:*');
  return updated;
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  const deleted = await Event.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  await CacheService.delPattern('events:*');
  return deleted;
};
