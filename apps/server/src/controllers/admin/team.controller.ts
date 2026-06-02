import { Request, Response, NextFunction } from 'express';
import * as teamService from '../../services/admin/team.service';

export const getAdmins = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;

    const result = await teamService.getAdmins(page, limit);
    res.status(200).json({
      success: true,
      data: result.admins,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
      },
      message: 'Team members fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestingAdminId = (req as any).admin?.sub || (req as any).admin?.id || 'system';
    const requestingAdminRole = (req as any).admin?.role || 'super_admin';
    const admin = await teamService.createAdmin(req.body, requestingAdminId, requestingAdminRole);
    res.status(201).json({
      success: true,
      data: admin,
      message: 'Team member invited successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAdminActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestingAdminId = (req as any).admin?.sub || (req as any).admin?.id;
    const requestingAdminRole = (req as any).admin?.role;
    if (!requestingAdminId || !requestingAdminRole) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    const admin = await teamService.toggleAdminActive(req.params.id, requestingAdminId, requestingAdminRole);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.status(200).json({
      success: true,
      data: { isActive: admin.isActive },
      message: 'Team member status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
