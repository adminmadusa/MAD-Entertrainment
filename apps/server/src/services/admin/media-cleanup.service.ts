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
