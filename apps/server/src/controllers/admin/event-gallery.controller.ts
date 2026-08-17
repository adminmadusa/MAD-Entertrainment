import { Request, Response, NextFunction } from 'express';

import { AdminEventGalleryService } from '../../services/admin/event-gallery.service';
import { sendSuccess } from '../../utils/response';

export const getGallery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const gallery = await AdminEventGalleryService.getGallery(eventId);
    sendSuccess(res, gallery, 'Gallery retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const addItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const adminId = req.admin!.sub;
    const items = await AdminEventGalleryService.addItems(eventId, req.body, adminId);
    sendSuccess(res, items, 'Gallery items added successfully');
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const adminId = req.admin!.sub;
    const settings = await AdminEventGalleryService.updateSettings(eventId, req.body, adminId);
    sendSuccess(res, settings, 'Gallery settings updated successfully');
  } catch (error) {
    next(error);
  }
};
