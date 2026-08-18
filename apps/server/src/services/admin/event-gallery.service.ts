import { Types } from 'mongoose';

import { deriveEventCapabilities } from '@mad/shared';
import { type EventGalleryItem, type EventGallerySettings } from '@mad/types';
import {
  AddGalleryItemsInput,
  ReorderGalleryItemsInput,
  UpdateGalleryItemInput,
  UpdateGallerySettingsInput,
} from '@mad/validations';

import { AppError } from '../../middleware/error.middleware';
import { EventGallerySettings as EventGallerySettingsModel } from '../../models/event-gallery-settings.schema';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';
import { safeDeleteImages } from './media-cleanup.service';

export class AdminEventGalleryService {
  /**
   * Retrieves the full gallery (items and settings) for an event.
   */
  static async getGallery(eventId: string): Promise<{
    items: EventGalleryItem[];
    settings: EventGallerySettings | { eventId: string; published: boolean };
  }> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw AppError.notFound('Event');

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
   * Updates the gallery publication state (publish/unpublish toggle).
   */
  static async updateSettings(
    eventId: string,
    data: UpdateGallerySettingsInput,
    adminId: string
  ): Promise<any> {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw AppError.notFound('Event');

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate,
    });

    if (!caps.capabilities.canPublishGallery) {
      throw AppError.badRequest('Galleries can only be published once the event is completed');
    }

    let settings = await EventGallerySettingsModel.findOne({ eventId });
    if (!settings) {
      settings = new EventGallerySettingsModel({ eventId });
    }

    if (typeof data.published === 'boolean') {
      settings.published = data.published;
      if (data.published) {
        settings.publishedAt = new Date();
        settings.publishedBy = new Types.ObjectId(adminId);
      }
    }

    await settings.save();
    return settings.toObject();
  }

  /**
   * Uploads/registers new gallery items.
   */
  static async addItems(
    eventId: string,
    data: AddGalleryItemsInput,
    adminId: string
  ): Promise<EventGalleryItem[]> {
    const event = await Event.findById(eventId).select('_id status startDate endDate bookingStartDate bookingEndDate').lean();
    if (!event) throw AppError.notFound('Event');

    const caps = deriveEventCapabilities({
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      bookingStartDate: event.bookingStartDate,
      bookingEndDate: event.bookingEndDate,
    });

    if (!caps.capabilities.canUploadGallery) {
      throw AppError.badRequest('Galleries can only be uploaded once booking is closed');
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

  /**
   * Deletes a gallery item, asynchronously purges the asset from Cloudinary,
   * and automatically reassigns cover if the deleted item was the cover.
   */
  static async deleteItem(
    eventId: string,
    itemId: string,
    _adminId: string
  ): Promise<{ success: true }> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw AppError.notFound('Event');

    const item = await EventGallery.findOne({ _id: itemId, eventId });
    if (!item) throw AppError.notFound('Gallery item');

    const wasCover = item.isCover;
    const publicId = item.publicId;

    await EventGallery.deleteOne({ _id: itemId, eventId });

    // Clean up Cloudinary asset asynchronously
    if (publicId) {
      safeDeleteImages([publicId], 'Event', 'delete');
    }

    // If this item was the cover, assign cover to the next available item
    if (wasCover) {
      const nextItem = await EventGallery.findOne({ eventId }).sort({ sortOrder: 1, createdAt: 1 });
      if (nextItem) {
        nextItem.isCover = true;
        await nextItem.save();
      }
    }

    return { success: true };
  }

  /**
   * Sets a specific gallery item as the primary cover photo for the event.
   */
  static async setCoverItem(
    eventId: string,
    itemId: string,
    _adminId: string
  ): Promise<{ success: true }> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw AppError.notFound('Event');

    const item = await EventGallery.findOne({ _id: itemId, eventId });
    if (!item) throw AppError.notFound('Gallery item');

    // Atomically reset all existing covers and set the new cover
    await EventGallery.updateMany({ eventId, isCover: true }, { isCover: false });
    await EventGallery.findByIdAndUpdate(itemId, { isCover: true });

    return { success: true };
  }

  /**
   * Updates metadata (e.g. caption) of a gallery item.
   */
  static async updateItem(
    eventId: string,
    itemId: string,
    data: UpdateGalleryItemInput,
    _adminId: string
  ): Promise<EventGalleryItem> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw AppError.notFound('Event');

    const item = await EventGallery.findOne({ _id: itemId, eventId });
    if (!item) throw AppError.notFound('Gallery item');

    if (data.caption !== undefined) {
      item.caption = data.caption;
    }

    await item.save();
    const obj = item.toObject();

    return {
      id: item._id ? item._id.toString() : '',
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
  }

  /**
   * Reorders items within an event's gallery.
   */
  static async reorderItems(
    eventId: string,
    data: ReorderGalleryItemsInput,
    _adminId: string
  ): Promise<{ success: true }> {
    const event = await Event.findById(eventId).select('_id').lean();
    if (!event) throw AppError.notFound('Event');

    const existingItems = await EventGallery.find({
      _id: { $in: data.itemIds },
      eventId,
    }).select('_id');

    if (existingItems.length !== data.itemIds.length) {
      throw AppError.badRequest('Invalid gallery item IDs in reorder request');
    }

    const bulkOps = data.itemIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, eventId },
        update: { $set: { sortOrder: index } },
      },
    }));

    await EventGallery.bulkWrite(bulkOps);
    return { success: true };
  }
}
