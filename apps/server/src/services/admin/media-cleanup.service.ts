import { cloudinary } from '../../config/cloudinary';
import { EventGallery } from '../../models/event-gallery.schema';
import { Event } from '../../models/event.schema';
import { logger } from '../../utils/logger';
import { UploadService } from './upload.service';

/**
 * Perform asynchronous, fire-and-forget deletion of Cloudinary assets.
 * Cleanup failures are logged but never thrown or allowed to disrupt database operations.
 *
 * @param publicIds Array of Cloudinary public IDs to delete.
 * @param entity The entity triggering cleanup ('Event' | 'DJOperator').
 * @param operation The operation causing cleanup ('update' | 'delete').
 */
export const safeDeleteImages = (
  publicIds: string[],
  entity: 'Event' | 'DJOperator',
  operation: 'update' | 'delete'
): void => {
  const idsToDelete = publicIds.filter((id) => !!id);
  if (idsToDelete.length === 0) return;

  // Run asynchronously without awaiting the overall result in the request thread
  Promise.all(
    idsToDelete.map(async (publicId) => {
      try {
        await UploadService.deleteImage(publicId);
      } catch (err: any) {
        logger.error(
          {
            entity,
            operation,
            publicId,
            error: err.message || err,
          },
          `Failed Cloudinary cleanup for ${entity} ${operation}`
        );
      }
    })
  ).catch((err) => {
    logger.error(
      {
        entity,
        operation,
        publicIds: idsToDelete,
        error: err.message || err,
      },
      `Unhandled error in safeDeleteImages during ${entity} ${operation}`
    );
  });
};

/**
 * Sweeps the temporary Cloudinary assets directory (events/temp/*) and deletes
 * any unreferenced images older than 24 hours.
 */
export const cleanupTemporaryAssets = async (): Promise<{ deletedCount: number; checkedCount: number }> => {
  let checkedCount = 0;
  let deletedCount = 0;
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // List all resources in the events/temp folder
    const response = await new Promise<any>((resolve, reject) => {
      cloudinary.api.resources(
        {
          type: 'upload',
          prefix: 'mad-entertrainment/events/temp/',
          max_results: 500,
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    const resources = response.resources || [];
    for (const resource of resources) {
      checkedCount++;
      const createdAt = new Date(resource.created_at);
      if (createdAt < twentyFourHoursAgo) {
        const publicId = resource.public_id;

        const isReferencedInEvent = await Event.exists({
          $or: [
            { 'bannerImage.publicId': publicId },
            { 'posterImage.publicId': publicId },
          ],
        });

        const isReferencedInGallery = await EventGallery.exists({
          publicId,
        });

        if (!isReferencedInEvent && !isReferencedInGallery) {
          await UploadService.deleteImage(publicId);
          deletedCount++;
        }
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message || err }, 'Error during temporary assets cleanup');
  }
  return { checkedCount, deletedCount };
};
