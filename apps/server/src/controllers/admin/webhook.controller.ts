import { Request, Response, NextFunction } from 'express';
import { WebhookEvent } from '../../models/webhook-event.schema';

export const getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 50,
      provider,
      status,
      startDate,
      endDate
    } = req.query as any;

    const query: any = {};
    if (provider) query.provider = provider;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = startDate;
      if (endDate) query.receivedAt.$lte = endDate;
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
