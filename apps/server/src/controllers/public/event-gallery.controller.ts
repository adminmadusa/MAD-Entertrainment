import { Request, Response, NextFunction } from 'express';
import { PublicEventGalleryService } from '../../services/public/event-gallery.service';
import { sendSuccess } from '../../utils/response';

export const getGallery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const gallery = await PublicEventGalleryService.getGallery(slug);
    sendSuccess(res, gallery, 'Gallery retrieved successfully');
  } catch (error) {
    next(error);
  }
};
