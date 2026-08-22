
import { Notification, INotification } from '../../models/notification.schema';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';

export const getNotifications = async (
  page: number = 1,
  limit: number = 15,
  channel?: string,
  sent?: string
): Promise<{ notifications: INotification[]; total: number; totalPages: number }> => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const skip = (safePage - 1) * safeLimit;
  const filter: Record<string, any> = {};

  if (typeof channel === 'string' && channel.trim()) {
    filter.channel = channel.trim().toLowerCase();
  }
  if (sent !== undefined && sent !== '') {
    if (String(sent) === 'true') {
      filter.$or = [
        { status: 'sent' },
        { status: { $exists: false }, isSent: true }
      ];
    } else {
      filter.$or = [
        { status: 'failed' },
        { status: { $exists: false }, isSent: false }
      ];
    }
  }

  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(safeLimit);

  return {
    notifications,
    total,
    totalPages: Math.ceil(total / safeLimit),
  };
};

export const retryNotification = async (id: string): Promise<INotification | null> => {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return null;
  }
  const notification = await Notification.findById(cleanId);
  if (!notification) {
    return null;
  }

  if (notification.isSent || notification.status === 'sent') {
    return notification;
  }

  try {
    if (notification.channel === 'email' && notification.recipient) {
      notification.status = 'processing';
      await notification.save();

      await sendEmail({
        to: notification.recipient,
        subject: notification.subject || 'MAD Notification Retry',
        html: notification.body || 'MAD Notification message content.',
      });
    }

    notification.isSent = true;
    notification.status = 'sent';
    notification.processedAt = new Date();
    await notification.save();
  } catch (err: any) {
    notification.status = 'failed';
    notification.errorMessage = err.message;
    notification.processedAt = new Date();
    await notification.save();
    logger.error({ err, notificationId: id }, '[Notification Service] Retry failed for notification');
    throw err;
  }

  return notification;
};
