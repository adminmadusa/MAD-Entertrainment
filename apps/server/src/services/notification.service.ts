import { Notification, INotification } from '../models/notification.schema';
import { auditLog } from '../utils/audit';

/**
 * Shared wrapper for creating notifications safely using a database-first idempotency strategy.
 * If a unique index violation occurs on a unique jobId, it catches the duplicate key error,
 * queries and logs the existing record, and returns it to the caller.
 *
 * @param data The notification document data or array of documents
 * @param options Query/Save options (such as mongoose transaction session)
 */
export const createNotificationSafe = async (data: any | any[], options?: any): Promise<any> => {
  const isArray = Array.isArray(data);
  const dataObj = isArray ? data[0] : data;
  const jobId = dataObj?.jobId;

  try {
    const docs = isArray ? data : [data];
    const created = await Notification.create(docs, options);
    if (isArray) {
      return Array.isArray(created) ? created : [created];
    } else {
      return Array.isArray(created) ? created[0] : created;
    }
  } catch (err: any) {
    // MongoDB duplicate key error code is 11000
    if (err.code === 11000 && jobId) {
      const existing = await Notification.findOne({ jobId }).session(options?.session || null);
      if (existing) {
        // Reuse existing MAD audit service and schema representation
        auditLog({
          action: 'NOTIFICATION_DUPLICATE_PREVENTED',
          status: 'success',
          description: `Prevented duplicate notification creation for jobId: ${jobId}`,
          metadata: {
            notificationId: existing._id.toString(),
            bookingId: existing.bookingId?.toString() || dataObj.bookingId?.toString(),
            jobId: jobId,
            notificationType: dataObj.type,
            requestSource: dataObj.bookingId ? `booking:${dataObj.bookingId}` : 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
        return isArray ? [existing] : existing;
      }
    }
    throw err;
  }
};
