import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { getEnv } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import * as eventService from '../../services/admin/event.service';
import { auditLog } from '../../utils/audit';

export const EVENT_MEMORIES_PREVIEW_TOKEN_TTL_MINUTES = 15;

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json({ success: true, data: { event }, message: 'Event created successfully' });
  } catch (error) {
    next(error);
  }
};

export const duplicateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = (req as any).user?.id; // Assuming auth middleware sets req.user
    if (!adminId) {
      throw AppError.unauthorized('User not authenticated');
    }
    
    // Check idempotency key
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['requestid'];
    if (!idempotencyKey) {
      throw AppError.badRequest('Idempotency key is required');
    }

    const { title, date, venue, publish } = req.body;
    
    const event = await eventService.duplicateEvent({
      sourceEventId: req.params.id,
      title,
      date,
      venue,
      publish,
      adminId,
    });
    
    // Focused response shape
    const responsePayload = {
      id: event._id,
      title: event.title,
      status: event.status,
      slug: event.slug,
      editUrl: `/events/${event._id}/edit` // Helpful reference for the frontend
    };

    res.status(201).json({ success: true, data: { event: responsePayload }, message: 'Event duplicated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const sortField = req.query.sortField as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
    const result = await eventService.getEvents(page, limit, { search, status, sortField, sortOrder });
    res.status(200).json({ success: true, data: result, message: 'Events fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: { event }, message: 'Event fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: { event }, message: 'Event updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.deleteEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getPreviewToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.id;
    const event = await eventService.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const adminId = (req as any).user?.sub;
    const expiresAt = new Date(Date.now() + EVENT_MEMORIES_PREVIEW_TOKEN_TTL_MINUTES * 60 * 1000);

    const token = jwt.sign(
      {
        eventId,
        adminId,
        issuedAt: Date.now(),
        expiresAt: expiresAt.getTime(),
      },
      getEnv().JWT_ADMIN_SECRET,
      { expiresIn: `${EVENT_MEMORIES_PREVIEW_TOKEN_TTL_MINUTES}m` }
    );

    auditLog({
      action: 'event.memories.preview.generated',
      status: 'success',
      metadata: {
        eventId,
        adminId,
        expiresAt: expiresAt.toISOString(),
      },
      description: `Preview token generated for event ${eventId} by admin ${adminId}`,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw AppError.badRequest('Must provide an array of ids');
    }
    const adminId = (req as any).admin.sub;
    const result = await eventService.bulkDeleteEvents(ids, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
