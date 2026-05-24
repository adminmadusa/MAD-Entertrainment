import { Request, Response } from 'express';

import { Reservation } from '../../models/reservation.schema';
import { ConsistencyService } from '../../services/consistency.service';
import { sendSuccess } from '../../utils/response';

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
