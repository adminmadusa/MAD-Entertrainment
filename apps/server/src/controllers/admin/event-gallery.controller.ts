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

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, itemId } = req.params;
    const adminId = req.admin!.sub;
    const result = await AdminEventGalleryService.deleteItem(eventId, itemId, adminId);
    sendSuccess(res, result, 'Gallery item deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const setCover = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, itemId } = req.params;
    const adminId = req.admin!.sub;
    const result = await AdminEventGalleryService.setCoverItem(eventId, itemId, adminId);
    sendSuccess(res, result, 'Gallery cover updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, itemId } = req.params;
    const adminId = req.admin!.sub;
    const item = await AdminEventGalleryService.updateItem(eventId, itemId, req.body, adminId);
    sendSuccess(res, item, 'Gallery item updated successfully');
  } catch (error) {
    next(error);
  }
};

export const reorderItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const adminId = req.admin!.sub;
    const result = await AdminEventGalleryService.reorderItems(eventId, req.body, adminId);
    sendSuccess(res, result, 'Gallery items reordered successfully');
  } catch (error) {
    next(error);
  }
};
