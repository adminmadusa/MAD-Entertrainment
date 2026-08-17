import mongoose, { Types } from 'mongoose';
import { EventGallery, MediaVisibility } from '../../models/event-gallery.schema';
import { EventGallerySettings } from '../../models/event-gallery-settings.schema';
import { Event } from '../../models/event.schema';
import { AppError } from '../../middleware/error.middleware';
import { AddGalleryItemsInput, ReorderGalleryItemsInput, UpdateGalleryItemInput, UpdateGallerySettingsInput } from '@mad/validations';
import { deriveEventCapabilities } from '@mad/shared';

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
      items,
      settings: settings || { eventId, published: false },
    };
  }

  /**
   * Updates the gallery settings (heading, publication state, etc.)
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
      throw new AppError('Galleries can only be modified once booking is closed', 400);
    }

    let settings = await EventGallerySettings.findOne({ eventId });
    if (!settings) {
      settings = new EventGallerySettings({ eventId });
    }

    if (data.heading !== undefined) settings.heading = data.heading;
    if (data.thankYouMessage !== undefined) settings.thankYouMessage = data.thankYouMessage;
    if (data.highlights !== undefined) settings.highlights = data.highlights;

    if (data.published !== undefined && settings.published !== data.published) {
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
      throw new AppError('Galleries can only be modified once booking is closed', 400);
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
      if (isCover) hasCover = true; // Only first item gets cover if none exists

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
    return inserted.map((doc) => doc.toObject());
  }

  /**
   * Deletes a gallery item and reassigns cover if necessary.
   */
  static async deleteItem(eventId: string, itemId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const item = await EventGallery.findOne({ _id: itemId, eventId }).session(session);
      if (!item) throw new AppError('Gallery item not found', 404);

      const wasCover = item.isCover;
      await EventGallery.deleteOne({ _id: itemId }).session(session);

      if (wasCover) {
        // Find next candidate for cover
        const nextCandidate = await EventGallery.findOne({ eventId })
          .sort({ sortOrder: 1, createdAt: 1 })
          .session(session);

        if (nextCandidate) {
          nextCandidate.isCover = true;
          await nextCandidate.save({ session });
        }
      }

      await this.normalizeSortOrders(eventId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Sets a specific item as the cover image.
   */
  static async setCover(eventId: string, itemId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const newCover = await EventGallery.findOne({ _id: itemId, eventId }).session(session);
      if (!newCover) throw new AppError('Gallery item not found', 404);
      if (newCover.isCover) {
        await session.abortTransaction();
        return newCover.toObject(); // Already cover
      }

      // Unset previous cover
      await EventGallery.updateMany(
        { eventId, isCover: true },
        { $set: { isCover: false } }
      ).session(session);

      // Set new cover
      newCover.isCover = true;
      await newCover.save({ session });

      await session.commitTransaction();
      return newCover.toObject();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Updates basic properties of a gallery item.
   */
  static async updateItem(eventId: string, itemId: string, data: UpdateGalleryItemInput) {
    const item = await EventGallery.findOne({ _id: itemId, eventId });
    if (!item) throw new AppError('Gallery item not found', 404);

    if (data.caption !== undefined) item.caption = data.caption;
    if (data.visibility !== undefined) item.visibility = data.visibility;

    await item.save();
    return item.toObject();
  }

  /**
   * Bulk reorders gallery items and normalizes their sortOrder.
   */
  static async reorderItems(eventId: string, data: ReorderGalleryItemsInput) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const items = await EventGallery.find({ eventId }).session(session);
      const itemMap = new Map(items.map(i => [i.id, i]));

      for (const update of data.items) {
        const item = itemMap.get(update.id);
        if (item) {
          item.sortOrder = update.sortOrder;
          await item.save({ session });
        }
      }

      await this.normalizeSortOrders(eventId, session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Internal helper to ensure sortOrder is contiguous (0, 1, 2, 3...)
   */
  private static async normalizeSortOrders(eventId: string, session: mongoose.ClientSession) {
    const items = await EventGallery.find({ eventId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .session(session);

    for (let i = 0; i < items.length; i++) {
      if (items[i].sortOrder !== i) {
        items[i].sortOrder = i;
        await items[i].save({ session });
      }
    }
  }
}
