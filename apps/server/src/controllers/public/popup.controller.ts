import { Request, Response, NextFunction } from 'express';

import { CacheService } from '../../services/cache.service';
import { PublicPopupService } from '../../services/public/popup.service';
import { sendSuccess } from '../../utils/response';

export async function getActivePopups(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = 'popups:active';
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      sendSuccess(res, cached, 'Active popups retrieved (cached)');
      return;
    }

    const popups = await PublicPopupService.getActivePopups();
    // Cache for 5 minutes — popups don't change frequently
    await CacheService.set(cacheKey, popups, 300);

    sendSuccess(res, popups, 'Active popups retrieved');
  } catch (err) {
    next(err);
  }
}
