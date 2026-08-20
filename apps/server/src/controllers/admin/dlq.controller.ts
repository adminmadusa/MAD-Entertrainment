import { Request, Response, NextFunction } from 'express';

import { AdminRole } from '@mad/shared';

import { AppError } from '../../middleware/error.middleware';
import { DeadLetterJob } from '../../models/dead-letter-job.schema';
import { DlqInspectionService } from '../../services/admin/dlq-inspection.service';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { auditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';

export async function listDeadLetterJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const queueName = req.query.queueName as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await DiagnosticsService.listDeadLetterJobs(page, limit, queueName, search);

    auditLog({
      action: 'DLQ_JOB_VIEWED',
      actor: req.admin ? { type: 'admin', id: req.admin.sub } : undefined,
      status: 'success',
      metadata: {
        role: req.admin?.role,
        page,
        limit,
        queueName,
        search,
      },
      description: `Viewed Dead Letter Queue listing (page ${page})`,
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getDeadLetterJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      auditLog({
        action: 'DLQ_PAYLOAD_ACCESS_DENIED',
        actor: req.admin ? { type: 'admin', id: req.admin.sub } : undefined,
        status: 'failure',
        metadata: {
          role: req.admin?.role,
          targetId: req.params.id,
          path: req.originalUrl,
        },
        description: `Access denied to decrypt DLQ payload for user ${req.admin?.email || 'unknown'}`,
      });
      return next(AppError.forbidden('Super admin access required'));
    }

    const dlqJob = await DeadLetterJob.findById(req.params.id);
    if (!dlqJob) {
      throw AppError.notFound('Dead letter job not found');
    }

    const { data, stacktrace } = DlqInspectionService.inspectJobPayload(dlqJob);

    auditLog({
      action: 'DLQ_PAYLOAD_VIEWED',
      actor: { type: 'admin', id: req.admin.sub },
      status: 'success',
      metadata: {
        role: req.admin.role,
        jobId: dlqJob.jobId,
        queueName: dlqJob.queueName,
        jobName: dlqJob.jobName,
      },
      description: `Decrypted and inspected DLQ payload for job ${dlqJob.jobId} in queue ${dlqJob.queueName}`,
    });

    sendSuccess(res, {
      _id: dlqJob._id,
      queueName: dlqJob.queueName,
      jobId: dlqJob.jobId,
      jobName: dlqJob.jobName,
      attemptsMade: dlqJob.attemptsMade,
      failedReason: dlqJob.failedReason,
      processedAt: dlqJob.processedAt,
      data,
      stacktrace,
    });
  } catch (err) {
    next(err);
  }
}

export async function retryFailedJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      auditLog({
        action: 'DLQ_REPLAY_BLOCKED',
        actor: req.admin ? { type: 'admin', id: req.admin.sub } : undefined,
        status: 'failure',
        metadata: {
          role: req.admin?.role,
          targetId: req.params.id,
        },
        description: `Blocked unauthorized single job replay attempt by user ${req.admin?.email || 'unknown'}`,
      });
      return next(AppError.forbidden('Super admin access required'));
    }

    const dlqId = req.params.id;
    const dlqJob = await DeadLetterJob.findById(dlqId);
    const success = await DiagnosticsService.retryDeadLetterJob(dlqId);
    if (!success) {
      throw AppError.badRequest('Failed to re-enqueue job');
    }

    if (dlqJob) {
      auditLog({
        action: 'DLQ_RETRY_TRIGGERED',
        actor: { type: 'admin', id: req.admin.sub },
        status: 'success',
        metadata: {
          role: req.admin.role,
          jobId: dlqJob.jobId,
          queueName: dlqJob.queueName,
          jobName: dlqJob.jobName,
        },
        description: `Manually replayed DLQ job ${dlqJob.jobId} into queue ${dlqJob.queueName}`,
      });
    }

    sendSuccess(res, null, 'Job successfully re-enqueued and clean up complete');
  } catch (err) {
    next(err);
  }
}

export async function retryAllFailedJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.admin?.role !== AdminRole.SUPER_ADMIN) {
      auditLog({
        action: 'DLQ_REPLAY_BLOCKED',
        actor: req.admin ? { type: 'admin', id: req.admin.sub } : undefined,
        status: 'failure',
        metadata: {
          role: req.admin?.role,
        },
        description: `Blocked unauthorized bulk job replay attempt by user ${req.admin?.email || 'unknown'}`,
      });
      return next(AppError.forbidden('Super admin access required'));
    }

    const stats = await DiagnosticsService.retryAllDeadLetterJobs();

    auditLog({
      action: 'DLQ_RETRY_ALL_TRIGGERED',
      actor: { type: 'admin', id: req.admin.sub },
      status: 'success',
      metadata: {
        role: req.admin.role,
        successCount: stats.successCount,
        failedCount: stats.failedCount,
      },
      description: `Manually replayed all DLQ jobs (success: ${stats.successCount}, failed: ${stats.failedCount})`,
    });

    sendSuccess(res, stats, 'Mass DLQ re-enqueue completion finished');
  } catch (err) {
    next(err);
  }
}
