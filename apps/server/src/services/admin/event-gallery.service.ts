import { Types } from 'mongoose';

import { deriveEventCapabilities } from '@mad/shared';
import { AddGalleryItemsInput, UpdateGallerySettingsInput } from '@mad/validations';

import { AppError } from '../../middleware/error.middleware';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';

export class AdminEventGalleryService {
  /**
   * Retrieves the full gallery (items and settings) for an event.
   */
  static async getGallery(eventId: string) {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw new AppError('Event not found', 404);

    const [items, settings] = await Promise.all([
      EventGallery.find({ eventId }).sort({ isCover: -1, sortOrder: 1, createdAt: 1 }).lean(),
      EventGallerySettings.findOne({ eventId }).lean(),
    ]);

    return {
      items: items.map(item => ({
        ...item,
        id: item._id ? item._id.toString() : '',
      })),
      settings: settings || { eventId, published: false },
    };
  }

  /**
   * Updates the gallery publication state.
   * Once published, the gallery cannot be un-published.
   */
  static async updateSettings(eventId: string, data: UpdateGallerySettingsInput, adminId: string) {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw new AppError('Event not found', 404);

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate
    });

    if (!caps.capabilities.canPublishGallery) {
      throw new AppError('Galleries can only be published once the event is completed', 400);
    }

    let settings = await EventGallerySettings.findOne({ eventId });
    if (!settings) {
      settings = new EventGallerySettings({ eventId });
    }

    // Hard lock: once published it stays published
    if (settings.published) {
      throw new AppError('Gallery is already published and cannot be modified', 400);
    }

    if (data.published) {
      settings.published = true;
      settings.publishedAt = new Date();
      settings.publishedBy = new Types.ObjectId(adminId);
    }

    await settings.save();
    return settings.toObject();
  }

  /**
   * Uploads/registers new gallery items.
   * Blocked once the gallery is published (final-state lock).
   */
  static async addItems(eventId: string, data: AddGalleryItemsInput, adminId: string) {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw new AppError('Event not found', 404);

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate
    });

    if (!caps.capabilities.canUploadGallery) {
      throw new AppError('Galleries can only be uploaded once booking is closed', 400);
    }

    // Hard lock: prevent uploads once gallery is published
    const existingSettings = await EventGallerySettings.findOne({ eventId }).lean();
    if (existingSettings?.published) {
      throw new AppError('Modifications are locked: Gallery is already published', 400);
    }

    // Prevent duplicates by publicId
    const existingPublicIds = await EventGallery.find({ eventId }).distinct('publicId');
    const existingSet = new Set(existingPublicIds);

    const newItems = data.items.filter((item) => !existingSet.has(item.publicId));
    if (newItems.length === 0) {
      return []; // All duplicates, ignore
    }

    const currentCount = await EventGallery.countDocuments({ eventId });
    let hasCover = !!(await EventGallery.exists({ eventId, isCover: true }));

    const docsToInsert = newItems.map((item, index) => {
      const isCover = !hasCover && index === 0;
      if (isCover) hasCover = true;

      return {
        ...item,
        eventId,
        sortOrder: currentCount + index,
        isCover,
        visibility: MediaVisibility.PUBLIC,
        uploadedBy: new Types.ObjectId(adminId),
      };
    });

    const inserted = await EventGallery.insertMany(docsToInsert);
    return inserted.map((doc) => {
      const obj = doc.toObject();
      return {
        ...obj,
        id: doc._id ? doc._id.toString() : '',
      };
    });
  }
}
