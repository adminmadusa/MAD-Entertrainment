import { Request, Response, NextFunction } from 'express';

import { AnalyticsService } from '../../services/admin/analytics.service';

export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getSummary();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const data = await AnalyticsService.getRevenue(days);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getAttendanceSummary();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceRankings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getAttendanceRankings();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
