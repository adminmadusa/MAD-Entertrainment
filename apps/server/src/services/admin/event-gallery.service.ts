import { Types } from 'mongoose';

import { deriveEventCapabilities } from '@mad/shared';
import { type EventGalleryItem, type EventGallerySettings } from '@mad/types';
import { AddGalleryItemsInput, UpdateGallerySettingsInput } from '@mad/validations';

import { AppError } from '../../middleware/error.middleware';
import { EventGallerySettings as EventGallerySettingsModel } from '../../models/event-gallery-settings.schema';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';

export class AdminEventGalleryService {
  /**
   * Retrieves the full gallery (items and settings) for an event.
   */
  static async getGallery(eventId: string): Promise<{
    items: EventGalleryItem[];
    settings: EventGallerySettings | { eventId: string; published: boolean };
  }> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw new AppError('Event not found', 404);

    const [items, settings] = await Promise.all([
      EventGallery.find({ eventId }).sort({ isCover: -1, sortOrder: 1, createdAt: 1 }).lean(),
      EventGallerySettingsModel.findOne({ eventId }).lean(),
    ]);

    return {
      items: items.map((item) => ({
        id: item._id ? item._id.toString() : '',
        eventId: item.eventId ? item.eventId.toString() : eventId,
        mediaType: item.mediaType,
        url: item.url,
        publicId: item.publicId,
        thumbnail: item.thumbnail,
        caption: item.caption,
        sortOrder: item.sortOrder,
        isCover: item.isCover,
        visibility: item.visibility,
        uploadedBy: item.uploadedBy ? item.uploadedBy.toString() : undefined,
        assetProvider: item.assetProvider,
        assetVersion: item.assetVersion,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
      })),
      settings: settings
        ? {
            id: settings._id.toString(),
            eventId: settings.eventId.toString(),
            heading: settings.heading,
            thankYouMessage: settings.thankYouMessage,
            highlights: settings.highlights,
            published: settings.published,
            publishedAt: settings.publishedAt ? new Date(settings.publishedAt).toISOString() : undefined,
            publishedBy: settings.publishedBy ? settings.publishedBy.toString() : undefined,
            createdAt: settings.createdAt ? new Date(settings.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: settings.updatedAt ? new Date(settings.updatedAt).toISOString() : new Date().toISOString(),
          }
        : { eventId, published: false },
    };
  }

  /**
   * Updates the gallery publication state.
   * Once published, the gallery cannot be un-published.
   */
  static async updateSettings(
    eventId: string,
    data: UpdateGallerySettingsInput,
    adminId: string
  ): Promise<any> {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw new AppError('Event not found', 404);

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate,
    });

    if (!caps.capabilities.canPublishGallery) {
      throw new AppError('Galleries can only be published once the event is completed', 400);
    }

    let settings = await EventGallerySettingsModel.findOne({ eventId });
    if (!settings) {
      settings = new EventGallerySettingsModel({ eventId });
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
  static async addItems(
    eventId: string,
    data: AddGalleryItemsInput,
    adminId: string
  ): Promise<EventGalleryItem[]> {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw new AppError('Event not found', 404);

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate,
    });

    if (!caps.capabilities.canUploadGallery) {
      throw new AppError('Galleries can only be uploaded once booking is closed', 400);
    }

    // Hard lock: prevent uploads once gallery is published
    const existingSettings = await EventGallerySettingsModel.findOne({ eventId }).lean();
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
        id: doc._id ? doc._id.toString() : '',
        eventId: obj.eventId ? obj.eventId.toString() : eventId,
        mediaType: obj.mediaType,
        url: obj.url,
        publicId: obj.publicId,
        thumbnail: obj.thumbnail,
        caption: obj.caption,
        sortOrder: obj.sortOrder,
        isCover: obj.isCover,
        visibility: obj.visibility,
        uploadedBy: obj.uploadedBy ? obj.uploadedBy.toString() : undefined,
        assetProvider: obj.assetProvider,
        assetVersion: obj.assetVersion,
        createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
      };
    });
  }
}
