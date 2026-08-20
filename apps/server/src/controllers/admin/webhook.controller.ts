import { Request, Response, NextFunction } from 'express';

import { WebhookEvent } from '../../models/webhook-event.schema';

export const getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const rawProvider = req.query.provider;
    const rawStatus = req.query.status;
    const rawStartDate = req.query.startDate;
    const rawEndDate = req.query.endDate;

    const page = Math.max(1, parseInt(String(rawPage || '1'), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(rawLimit || '50'), 10) || 50));

    const query: Record<string, any> = {};
    if (typeof rawProvider === 'string' && rawProvider.trim()) {
      query.provider = rawProvider.trim().toLowerCase();
    }
    if (typeof rawStatus === 'string' && rawStatus.trim()) {
      query.status = rawStatus.trim().toLowerCase();
    }

    if (rawStartDate || rawEndDate) {
      const receivedAtFilter: Record<string, Date> = {};
      if (typeof rawStartDate === 'string' && !isNaN(Date.parse(rawStartDate))) {
        receivedAtFilter.$gte = new Date(rawStartDate);
      }
      if (typeof rawEndDate === 'string' && !isNaN(Date.parse(rawEndDate))) {
        receivedAtFilter.$lte = new Date(rawEndDate);
      }
      if (Object.keys(receivedAtFilter).length > 0) {
        query.receivedAt = receivedAtFilter;
      }
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      WebhookEvent.find(query)
        .select('eventId provider eventType status errorMessage receivedAt bookingId')
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bookingId', 'bookingId')
        .lean(),
      WebhookEvent.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Webhooks fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};
