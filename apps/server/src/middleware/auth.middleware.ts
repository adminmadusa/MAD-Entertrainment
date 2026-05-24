import { AdminRole } from '@mad/shared';
<<<<<<< Updated upstream
import { Request, Response, NextFunction } from 'express';
=======
import { Types } from 'mongoose';
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function ensureBookingOwner(reqUserId: string | undefined, bookingUserId: Types.ObjectId | undefined): void {
  if (bookingUserId) {
    if (!reqUserId) {
      throw new Error('User not authenticated');
    }
    if (bookingUserId.toString() !== reqUserId) {
      throw new Error('User does not own the booking');
    }
  }
}

>>>>>>> Stashed changes

import { verifyUserToken, verifyAdminToken, extractBearerToken, JwtUserPayload, JwtAdminPayload } from '../utils/jwt';
import { logger } from '../utils/logger';
import { sendUnauthorized, sendForbidden } from '../utils/response';

// ─── Extended Request Types ───────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      admin?: JwtAdminPayload;
    }
  }
}

// ─── Require Authenticated User ───────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    sendUnauthorized(res, 'Authentication token required');
    return;
  }

  try {
    req.user = verifyUserToken(token);
    next();
  } catch (err) {
    logger.debug({ err }, 'Invalid user token');
    sendUnauthorized(res, 'Invalid or expired token');
  }
}

// ─── Optional Auth (doesn't fail if no token) ────────────────

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (token) {
    try {
      req.user = verifyUserToken(token);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}

// ─── Require Admin ────────────────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    sendUnauthorized(res, 'Admin authentication required');
    return;
  }

  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch (err) {
    logger.debug({ err }, 'Invalid admin token');
    sendUnauthorized(res, 'Invalid or expired admin token');
  }
}

// ─── Require Specific Admin Roles ────────────────────────────

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      sendUnauthorized(res, 'Admin authentication required');
      return;
    }

    if (!roles.includes(req.admin.role as AdminRole)) {
      sendForbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
      return;
    }

    next();
  };
}

// ─── Require Super Admin ──────────────────────────────────────

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.admin) {
    sendUnauthorized(res, 'Admin authentication required');
    return;
  }

  if (req.admin.role !== AdminRole.SUPER_ADMIN) {
    sendForbidden(res, 'Super admin access required');
    return;
  }

  next();
}
