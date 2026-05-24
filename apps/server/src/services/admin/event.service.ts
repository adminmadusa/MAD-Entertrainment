import { Event, IEvent } from '../../models/event.schema';

export const createEvent = async (data: Partial<IEvent>): Promise<IEvent> => {
  const event = new Event(data);
  return await event.save();
};

export const getEvents = async (page: number = 1, limit: number = 10): Promise<{ events: IEvent[]; total: number; pages: number }> => {
  const skip = (page - 1) * limit;
  const total = await Event.countDocuments();
  // Populate related entities for admin view
  const events = await Event.find()
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
  return await Event.findByIdAndUpdate(id, data, { new: true });
};

export const deleteEvent = async (id: string): Promise<IEvent | null> => {
  return await Event.findByIdAndDelete(id);
};
