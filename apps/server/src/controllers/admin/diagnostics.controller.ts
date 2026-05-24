import { Request, Response, NextFunction } from 'express';

import { Reservation } from '../../models/reservation.schema';
import { ConsistencyService } from '../../services/consistency.service';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';

export async function getConsistencyDiagnostics(_req: Request, res: Response): Promise<void> {
  const report = await ConsistencyService.generateReport();
  sendSuccess(res, report);
}

export async function repairConsistency(_req: Request, res: Response): Promise<void> {
  const report = await ConsistencyService.runRepairCycle();
  sendSuccess(res, report, 'Consistency repair cycle completed');
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const query = status ? { status } : {};
  const reservations = await Reservation.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
  sendSuccess(res, reservations);
}

export async function getSystemDiagnostics(_req: Request, res: Response): Promise<void> {
  const report = await DiagnosticsService.generateReport();
  sendSuccess(res, report, 'System health diagnostics retrieved');
}

export async function retryFailedJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dlqId = req.params.id;
    const success = await DiagnosticsService.retryDeadLetterJob(dlqId);
    if (!success) {
      throw AppError.badRequest('Failed to re-enqueue job');
    }
    sendSuccess(res, null, 'Job successfully re-enqueued and clean up complete');
  } catch (err) {
    next(err);
  }
}

export async function retryAllFailedJobs(_req: Request, res: Response): Promise<void> {
  const stats = await DiagnosticsService.retryAllDeadLetterJobs();
  sendSuccess(res, stats, 'Mass DLQ re-enqueue completion finished');
}
