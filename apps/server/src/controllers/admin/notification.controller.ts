import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../../services/admin/notification.service';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const channel = req.query.channel as string;
    const sent = req.query.sent as string;

    const result = await notificationService.getNotifications(page, limit, channel, sent);
    res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
      },
      message: 'Notifications logs fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const retryNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.retryNotification(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification log not found' });
    }
    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification retry executed successfully',
    });
  } catch (error) {
    next(error);
  }
};
