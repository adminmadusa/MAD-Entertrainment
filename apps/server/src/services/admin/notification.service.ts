import { Notification, INotification } from '../../models/notification.schema';
import { sendEmail } from '../../utils/email';

export const getNotifications = async (
  page: number = 1,
  limit: number = 15,
  channel?: string,
  sent?: string
): Promise<{ notifications: INotification[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;
  const filter: Record<string, any> = {};

  if (channel) {
    filter.channel = channel;
  }
  if (sent !== undefined && sent !== '') {
    filter.isSent = sent === 'true';
  }

  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    notifications,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

export const retryNotification = async (id: string): Promise<INotification | null> => {
  const notification = await Notification.findById(id);
  if (!notification) {
    return null;
  }

  if (notification.isSent) {
    return notification;
  }

  try {
    if (notification.channel === 'email' && notification.recipient) {
      await sendEmail({
        to: notification.recipient,
        subject: notification.subject || 'MAD Notification Retry',
        html: notification.body || 'MAD Notification message content.',
      });
    }

    notification.isSent = true;
    notification.retryCount += 1;
    await notification.save();
  } catch (err: any) {
    notification.retryCount += 1;
    await notification.save();
    console.error(`[Notification Service] Retry failed for notification ${id}:`, err);
    throw err;
  }

  return notification;
};
