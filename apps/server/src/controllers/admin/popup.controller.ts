import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../../services/cache.service';
import * as popupService from '../../services/admin/popup.service';

const ACTIVE_POPUPS_CACHE_KEY = 'popups:active';

export const getPopups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;

    const result = await popupService.getPopups(page, limit);
    res.status(200).json({
      success: true,
      data: result.popups,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
      },
      message: 'Popup campaigns fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getPopupById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const popup = await popupService.getPopupById(req.params.id);
    if (!popup) {
      return res.status(404).json({ success: false, message: 'Popup campaign not found' });
    }
    res.status(200).json({
      success: true,
      data: popup,
      message: 'Popup campaign fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createPopup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const popup = await popupService.createPopup(req.body);
    // Evict active public popups cache to reflect changes immediately
    await CacheService.del(ACTIVE_POPUPS_CACHE_KEY);

    res.status(201).json({
      success: true,
      data: popup,
      message: 'Popup campaign created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePopup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const popup = await popupService.updatePopup(req.params.id, req.body);
    if (!popup) {
      return res.status(404).json({ success: false, message: 'Popup campaign not found' });
    }
    // Evict active public popups cache to reflect changes immediately
    await CacheService.del(ACTIVE_POPUPS_CACHE_KEY);

    res.status(200).json({
      success: true,
      data: popup,
      message: 'Popup campaign updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deletePopup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const popup = await popupService.deletePopup(req.params.id);
    if (!popup) {
      return res.status(404).json({ success: false, message: 'Popup campaign not found' });
    }
    // Evict active public popups cache to reflect changes immediately
    await CacheService.del(ACTIVE_POPUPS_CACHE_KEY);

    res.status(200).json({
      success: true,
      message: 'Popup campaign deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const togglePopup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const popup = await popupService.togglePopup(req.params.id);
    if (!popup) {
      return res.status(404).json({ success: false, message: 'Popup campaign not found' });
    }
    // Evict active public popups cache to reflect changes immediately
    await CacheService.del(ACTIVE_POPUPS_CACHE_KEY);

    res.status(200).json({
      success: true,
      data: { isActive: popup.isActive },
      message: 'Popup campaign status toggled successfully',
    });
  } catch (error) {
    next(error);
  }
};
