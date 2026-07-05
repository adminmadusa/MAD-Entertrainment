import { Request, Response, NextFunction } from 'express';

import { AdminUserService } from '../../services/admin/user.service';

/**
 * Fetch paginated list of customers (registered or guest)
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const type = (req.query.type as 'registered' | 'guest') || 'registered';
    const sortField = req.query.sortField as 'name' | 'email' | 'createdAt' | 'lastLogin' | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await AdminUserService.listUsers(page, limit, search, type, sortField, sortOrder);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Users fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch detailed profile of a registered user
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AdminUserService.getRegisteredUserDetail(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'User details fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch detailed profile of a guest user by email
 */
export const getGuestUserByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AdminUserService.getGuestUserDetail(req.params.email);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Guest user not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Guest user details fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggles a user's active/suspended status
 */
export const toggleUserActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = req.admin?.sub || 'system';
    const result = await AdminUserService.toggleUserActive(req.params.id, adminId);

    res.status(200).json({
      success: true,
      data: {
        id: result._id.toString(),
        email: result.email,
        isActive: result.isActive,
      },
      message: `User account has been successfully ${result.isActive ? 'activated' : 'suspended'}`,
    });
  } catch (error) {
    next(error);
  }
};
