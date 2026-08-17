import mongoose from 'mongoose';

import { AppError } from '../../middleware/error.middleware';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';

export class PublicEventGalleryService {
  /**
   * Retrieves the public gallery for an event.
   * Returns only PUBLIC items and throws if settings.published is false.
   */
  static async getGallery(eventIdOrSlug: string) {
    // Determine if we are querying by ObjectId or slug
    const isObjectId = mongoose.Types.ObjectId.isValid(eventIdOrSlug);
    const query = isObjectId ? { _id: eventIdOrSlug } : { slug: eventIdOrSlug };

    const event = await Event.findOne(query).select('_id title').lean();
    if (!event) throw new AppError('Event not found', 404);

    const settings = await EventGallerySettings.findOne({ eventId: event._id }).lean();
    if (!settings || !settings.published) {
      throw new AppError('Gallery is not published', 404);
    }

    const gallery = await EventGallery.find({
      eventId: event._id,
      visibility: MediaVisibility.PUBLIC
    })
      .sort({ isCover: -1, sortOrder: 1, createdAt: 1 })
      .lean();

    return {
      event: {
        id: event._id.toString(),
        title: event.title
      },
      settings: {
        heading: settings.heading,
        thankYouMessage: settings.thankYouMessage,
        published: settings.published
      },
      gallery: gallery.map(item => ({
        id: item._id.toString(),
        mediaType: item.mediaType,
        url: item.url,
        thumbnail: item.thumbnail,
        caption: item.caption,
        isCover: item.isCover,
        sortOrder: item.sortOrder
      }))
    };
  }
}
