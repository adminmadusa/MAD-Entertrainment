import { Request, Response, NextFunction } from 'express';

import { AdminRole } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { Reservation } from '../../models/reservation.schema';
import { ConsistencyService } from '../../services/consistency.service';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { auditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

export * from './dlq.controller';
export * from './queue-control.controller';

export async function getConsistencyDiagnostics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      return next(AppError.forbidden('Super admin access required'));
    }
    const report = await ConsistencyService.generateReport();
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
}

export async function repairConsistency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      auditLog({
        action: 'UNAUTHORIZED_ADMIN_OPERATION',
        actor: req.admin ? { type: 'admin', id: req.admin.sub } : undefined,
        status: 'failure',
        metadata: {
          role: req.admin?.role,
          action: 'repairConsistency',
        },
        description: `Blocked unauthorized consistency repair attempt by user ${req.admin?.email || 'unknown'}`,
      });
      return next(AppError.forbidden('Super admin access required'));
    }

    const report = await ConsistencyService.runRepairCycle();

    auditLog({
      action: 'DIAGNOSTICS_REPAIR_TRIGGERED',
      actor: { type: 'admin', id: req.admin.sub },
      status: 'success',
      metadata: {
        role: req.admin.role,
        repairs: report.repairs,
      },
      description: `Manually triggered system consistency repair cycle`,
    });

    sendSuccess(res, report, 'Consistency repair cycle completed');
  } catch (err) {
    next(err);
  }
}

export async function listReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      return next(AppError.forbidden('Super admin access required'));
    }
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const query = status ? { status } : {};
    const reservations = await Reservation.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
    sendSuccess(res, reservations);
  } catch (err) {
    next(err);
  }
}

export async function getSystemDiagnostics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await DiagnosticsService.generateReport();
    sendSuccess(res, report, 'System health diagnostics retrieved');
  } catch (err) {
    next(err);
  }
}
