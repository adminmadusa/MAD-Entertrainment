import mongoose from 'mongoose';

import { Notification, INotification } from '../../models/notification.schema';
import { sendEmail } from '../../utils/email';
import { logger } from '../../utils/logger';

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
    if (sent === 'true') {
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
