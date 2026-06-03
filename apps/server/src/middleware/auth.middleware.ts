import { AdminRole } from '@mad/shared';
import { Request, Response, NextFunction } from 'express';

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

import { AdminModel } from '../models/admin.schema';
import { auditLog } from '../utils/audit';


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

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    sendUnauthorized(res, 'Admin authentication required');
    return;
  }

  try {
    const adminPayload = verifyAdminToken(token);

    // Strict Role Enum Validation
    const isValidRole = Object.values(AdminRole).includes(adminPayload.role as AdminRole);
    if (!isValidRole) {
      logger.error(
        { role: adminPayload.role, email: adminPayload.email },
        'Security Alert: Malformed or invalid role detected in JWT payload'
      );
      auditLog({
        action: 'ADMIN_ACCESS_DENIED',
        actor: { type: 'admin', id: adminPayload.sub },
        status: 'failure',
        metadata: {
          email: adminPayload.email,
          role: adminPayload.role,
          reason: 'invalid_role_assignment',
        },
        description: `Access denied: Malformed or invalid role detected in JWT payload for ${adminPayload.email}`,
      });
      sendForbidden(res, 'Invalid role assignment');
      return;
    }

    // Active Account Verification: Load Admin from Database
    const dbAdmin = await AdminModel.findById(adminPayload.sub);
    if (!dbAdmin) {
      auditLog({
        action: 'ADMIN_ACCESS_DENIED',
        actor: { type: 'admin', id: adminPayload.sub },
        status: 'failure',
        metadata: { email: adminPayload.email, reason: 'admin_not_found' },
        description: `Access denied: administrative account not found for ${adminPayload.email}`,
      });
      sendUnauthorized(res, 'Admin account not found');
      return;
    }

    if (!dbAdmin.isActive) {
      auditLog({
        action: 'INACTIVE_ADMIN_ACCESS_ATTEMPT',
        actor: { type: 'admin', id: adminPayload.sub },
        status: 'failure',
        metadata: { email: adminPayload.email, reason: 'account_deactivated' },
        description: `Blocked access attempt by deactivated admin ${adminPayload.email}`,
      });
      sendUnauthorized(res, 'Account has been deactivated');
      return;
    }

    // Revoke access if password version has been updated (e.g. password reset)
    if (adminPayload.version !== undefined && dbAdmin.passwordVersion !== undefined && dbAdmin.passwordVersion !== adminPayload.version) {
      auditLog({
        action: 'ADMIN_ACCESS_DENIED',
        actor: { type: 'admin', id: adminPayload.sub },
        status: 'failure',
        metadata: {
          email: adminPayload.email,
          reason: 'session_revoked_by_credential_change',
        },
        description: `Access denied: Session expired due to password/role credential update for ${adminPayload.email}`,
      });
      sendUnauthorized(res, 'Session expired due to credential update');
      return;
    }

    // Hydrate req.admin with database-verified details (avoid stale JWT token data)
    req.admin = {
      sub: dbAdmin._id.toString(),
      email: dbAdmin.email,
      role: dbAdmin.role as AdminRole,
      version: dbAdmin.passwordVersion ?? 0,
    };
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

    // Strict Role Enum Validation
    const isValidRole = Object.values(AdminRole).includes(req.admin.role as AdminRole);
    if (!isValidRole) {
      logger.error(
        { role: req.admin.role, email: req.admin.email },
        'Security Alert: Malformed or invalid role detected in requireRole'
      );
      auditLog({
        action: 'ADMIN_ACCESS_DENIED',
        actor: { type: 'admin', id: req.admin.sub },
        status: 'failure',
        metadata: {
          email: req.admin.email,
          role: req.admin.role,
          reason: 'invalid_role_assignment',
        },
        description: `Access denied: Malformed or invalid role in requireRole for ${req.admin.email}`,
      });
      sendForbidden(res, 'Invalid role assignment');
      return;
    }

    if (!roles.includes(req.admin.role as AdminRole)) {
      auditLog({
        action: 'UNAUTHORIZED_ADMIN_OPERATION',
        actor: { type: 'admin', id: req.admin.sub },
        status: 'failure',
        metadata: {
          email: req.admin.email,
          role: req.admin.role,
          requiredRoles: roles,
          path: req.originalUrl,
        },
        description: `Access denied: Required role ${roles.join(' or ')} not possessed by ${req.admin.email}`,
      });
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

  // Strict Role Enum Validation
  const isValidRole = Object.values(AdminRole).includes(req.admin.role as AdminRole);
  if (!isValidRole) {
    logger.error(
      { role: req.admin.role, email: req.admin.email },
      'Security Alert: Malformed or invalid role detected in requireSuperAdmin'
    );
    auditLog({
      action: 'ADMIN_ACCESS_DENIED',
      actor: { type: 'admin', id: req.admin.sub },
      status: 'failure',
      metadata: {
        email: req.admin.email,
        role: req.admin.role,
        reason: 'invalid_role_assignment',
      },
      description: `Access denied: Malformed or invalid role in requireSuperAdmin for ${req.admin.email}`,
    });
    sendForbidden(res, 'Invalid role assignment');
    return;
  }

  if (req.admin.role !== AdminRole.SUPER_ADMIN) {
    auditLog({
      action: 'UNAUTHORIZED_ADMIN_OPERATION',
      actor: { type: 'admin', id: req.admin.sub },
      status: 'failure',
      metadata: {
        email: req.admin.email,
        role: req.admin.role,
        reason: 'super_admin_role_required',
        path: req.originalUrl,
      },
      description: `Access denied: Super Admin privilege required for ${req.admin.email}`,
    });
    sendForbidden(res, 'Super admin access required');

    return;
  }

  next();
}