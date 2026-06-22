import { Request, Response, NextFunction } from 'express';
import { AdminRole } from '@mad/shared';

import { Reservation } from '../../models/reservation.schema';
import { DeadLetterJob } from '../../models/dead-letter-job.schema';
import { ConsistencyService } from '../../services/consistency.service';
import { DiagnosticsService } from '../../services/diagnostics.service';
import { QueueService, QueueControlStatus } from '../../services/queue.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { auditLog } from '../../utils/audit';
<<<<<<< HEAD
import { ALLOWED_QUEUE_NAMES } from '../../validations/queue.validation';
=======
import { decryptPayload, isEncrypted } from '../../utils/encryption';
>>>>>>> develop

function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  const redactedKeys = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'apiKey',
    'clientSecret',
    'sessionId',
  ];

  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (redactedKeys.some((rk) => rk.toLowerCase() === key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else {
      result[key] = redactSecrets(obj[key]);
    }
  }
  return result;
}

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

export async function getSystemDiagnostics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Accessible to both Admin and SuperAdmin
    const report = await DiagnosticsService.generateReport();
    sendSuccess(res, report, 'System health diagnostics retrieved');
  } catch (err) {
    next(err);
  }
}

export async function listDeadLetterJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
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
    // RBAC: SUPER_ADMIN ONLY
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

    let payload = dlqJob.data;
    if (isEncrypted(payload)) {
      const decrypted = decryptPayload(payload);
      if (Buffer.byteLength(decrypted, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
      payload = JSON.parse(decrypted);
    } else if (payload) {
      const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (Buffer.byteLength(stringified, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
    }

    let stacktrace = dlqJob.stacktrace;
    if (Array.isArray(stacktrace) && stacktrace.length === 1 && isEncrypted(stacktrace[0])) {
      const decrypted = decryptPayload(stacktrace[0]);
      if (Buffer.byteLength(decrypted, 'utf8') > 500 * 1024) {
        throw AppError.badRequest('Payload exceeds inspection limit');
      }
      stacktrace = JSON.parse(decrypted);
    }

    const redactedPayload = redactSecrets(payload);

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
      data: redactedPayload,
      stacktrace,
    });
  } catch (err) {
    next(err);
  }
}

export async function retryFailedJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // RBAC: SUPER_ADMIN ONLY
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
    // RBAC: SUPER_ADMIN ONLY
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

// ─── Queue Control Handlers ──────────────────────────────────────────────────

export async function getQueuesStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const statuses: QueueControlStatus[] = await Promise.all(
      ALLOWED_QUEUE_NAMES.map((name) => QueueService.getQueueStatus(name))
    );
    sendSuccess(res, statuses, 'Queue statuses retrieved');
  } catch (err) {
    next(err);
  }
}

export async function pauseQueueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.params;
    await QueueService.pauseQueue(name);
    auditLog({
      action: 'QUEUE_PAUSED',
      actor: { type: 'admin', id: req.admin!.sub },
      status: 'success',
      metadata: {
        role: req.admin!.role,
        queueName: name,
        timestamp: new Date().toISOString(),
      },
      description: `Queue ${name} paused by ${req.admin!.email}`,
    });
    sendSuccess(res, { queueName: name }, `Queue ${name} paused successfully`);
  } catch (err) {
    next(err);
  }
}

export async function resumeQueueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.params;
    await QueueService.resumeQueue(name);
    auditLog({
      action: 'QUEUE_RESUMED',
      actor: { type: 'admin', id: req.admin!.sub },
      status: 'success',
      metadata: {
        role: req.admin!.role,
        queueName: name,
        timestamp: new Date().toISOString(),
      },
      description: `Queue ${name} resumed by ${req.admin!.email}`,
    });
    sendSuccess(res, { queueName: name }, `Queue ${name} resumed successfully`);
  } catch (err) {
    next(err);
  }
}

export async function drainQueueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.params;

    // Drain protection guard — transactional queues must never be drained
    if (name !== 'marketing-queue') {
      auditLog({
        action: 'QUEUE_DRAIN_BLOCKED',
        actor: { type: 'admin', id: req.admin!.sub },
        status: 'failure',
        metadata: {
          role: req.admin!.role,
          queueName: name,
          timestamp: new Date().toISOString(),
          reason: 'transactional_queue_drain_prohibited',
        },
        description: `Drain blocked on transactional queue ${name} by ${req.admin!.email}`,
      });
      return next(AppError.forbidden('Draining is prohibited on transactional queues'));
    }

    auditLog({
      action: 'QUEUE_DRAIN_ATTEMPTED',
      actor: { type: 'admin', id: req.admin!.sub },
      status: 'pending',
      metadata: {
        role: req.admin!.role,
        queueName: name,
        timestamp: new Date().toISOString(),
      },
      description: `Drain initiated on queue ${name} by ${req.admin!.email}`,
    });

    await QueueService.drainQueue(name);

    auditLog({
      action: 'QUEUE_DRAINED',
      actor: { type: 'admin', id: req.admin!.sub },
      status: 'success',
      metadata: {
        role: req.admin!.role,
        queueName: name,
        timestamp: new Date().toISOString(),
      },
      description: `Queue ${name} successfully drained by ${req.admin!.email}`,
    });

    sendSuccess(res, { queueName: name }, `Queue ${name} drained successfully`);
  } catch (err) {
    next(err);
  }
}
