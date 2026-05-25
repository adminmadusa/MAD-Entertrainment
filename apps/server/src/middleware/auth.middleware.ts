import { AdminRole } from '@mad/shared';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import {
  verifyUserToken,
  verifyAdminToken,
  verifySessionToken,
  extractBearerToken,
  JwtUserPayload,
  JwtAdminPayload,
} from '../utils/jwt';

import { logger } from '../utils/logger';

import {
  sendUnauthorized,
  sendForbidden,
} from '../utils/response';

// ─────────────────────────────────────────────
// Booking Ownership Helper
// ─────────────────────────────────────────────

export function ensureBookingOwner(
  reqUserId: string | undefined,
  bookingUserId: Types.ObjectId | undefined
): void {
  if (bookingUserId) {
    if (!reqUserId) {
      throw new Error('User not authenticated');
    }

    if (bookingUserId.toString() !== reqUserId) {
      throw new Error('User does not own the booking');
    }
  }
}

// ─────────────────────────────────────────────
// Extend Express Request
// ─────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      admin?: JwtAdminPayload;

      session?: {
        sessionId: string;
      };
    }
  }
}

// ─────────────────────────────────────────────
// Require User Auth
// USER JWT ONLY
// ─────────────────────────────────────────────

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

// ─────────────────────────────────────────────
// Optional Auth
// Supports:
// - User JWT
// - Session JWT
// ─────────────────────────────────────────────

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  // ─────────────────────────
  // Try user token first
  // ─────────────────────────

  try {
    req.user = verifyUserToken(token);

    next();
    return;
  } catch {
    // ignore
  }

  // ─────────────────────────
  // Try session token second
  // ─────────────────────────

  try {
    const sessionId = verifySessionToken(token);

    req.session = {
      sessionId,
    };

    next();
    return;
  } catch (err) {
    logger.debug({ err }, 'Invalid session token');
  }

  next();
}

// ─────────────────────────────────────────────
// Require Admin
// ─────────────────────────────────────────────

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

// ─────────────────────────────────────────────
// Require Specific Admin Roles
// ─────────────────────────────────────────────

export function requireRole(...roles: AdminRole[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.admin) {
      sendUnauthorized(res, 'Admin authentication required');
      return;
    }

    if (!roles.includes(req.admin.role as AdminRole)) {
      sendForbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}`
      );

      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────
// Require Super Admin
// ─────────────────────────────────────────────

export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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