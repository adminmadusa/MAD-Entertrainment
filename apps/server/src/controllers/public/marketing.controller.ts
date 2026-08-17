import { Request, Response, NextFunction } from 'express';

import { MarketingService } from '../../services/marketing.service';

export class MarketingController {
  /**
   * Handles user unsubscribe requests.
   * GET /api/marketing/unsubscribe?email=...&token=...
   */
  static async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, token } = req.query;
      await MarketingService.unsubscribe(String(email || ''), String(token || ''));

      res.status(200).json({
        success: true,
        message: 'You have been successfully unsubscribed from marketing emails.',
      });
    } catch (err) {
      next(err);
    }
  }
}

