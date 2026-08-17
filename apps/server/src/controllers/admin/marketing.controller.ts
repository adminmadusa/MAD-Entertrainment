import { Request, Response, NextFunction } from 'express';

import { MarketingService } from '../../services/marketing.service';

export class MarketingController {
  /**
   * Triggers a marketing bulk email campaign.
   * POST /api/admin/marketing/send
   */
  static async sendCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { subject, html } = req.body;
      const result = await MarketingService.sendCampaign(subject, html);

      res.status(200).json({
        success: true,
        queued: result.queued,
      });
    } catch (err) {
      next(err);
    }
  }
}

