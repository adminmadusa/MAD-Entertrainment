import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../middleware/error.middleware';
import { QueueService, QueueControlStatus } from '../../services/queue.service';
import { auditLog } from '../../utils/audit';
import { sendSuccess } from '../../utils/response';
import { ALLOWED_QUEUE_NAMES } from '../../validations/queue.validation';

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
