import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import * as eventService from '../../services/admin/event.service';
import { getEnv } from '../../config/env';
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

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const result = await eventService.getEvents(page, limit, { search, status });
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
