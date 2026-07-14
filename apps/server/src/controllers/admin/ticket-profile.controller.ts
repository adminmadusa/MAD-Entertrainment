import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import * as ticketProfileService from '../../services/admin/ticket-profile.service';

export const createTicketProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await ticketProfileService.createTicketProfile(req.body);
    res.status(201).json({ success: true, data: { profile }, message: 'Ticket profile created successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTicketProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await ticketProfileService.getTicketProfiles();
    res.status(200).json({ success: true, data: { profiles }, message: 'Ticket profiles fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTicketProfileById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await ticketProfileService.getTicketProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Ticket profile not found' });
    }
    res.status(200).json({ success: true, data: { profile }, message: 'Ticket profile fetched successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateTicketProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await ticketProfileService.updateTicketProfile(req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Ticket profile not found' });
    }
    res.status(200).json({ success: true, data: { profile }, message: 'Ticket profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteTicketProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await ticketProfileService.deleteTicketProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Ticket profile not found' });
    }
    res.status(200).json({ success: true, message: 'Ticket profile deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteTicketProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw AppError.badRequest('Must provide an array of ids');
    }
    const adminId = (req as any).admin.id;
    const result = await ticketProfileService.bulkDeleteTicketProfiles(ids, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTicketProfileStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, isActive } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw AppError.badRequest('Must provide an array of ids');
    }
    if (typeof isActive !== 'boolean') {
      throw AppError.badRequest('isActive must be a boolean');
    }
    const adminId = (req as any).admin.id;
    const result = await ticketProfileService.bulkUpdateTicketProfileStatus(ids, isActive, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
