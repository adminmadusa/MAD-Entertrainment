import { logger } from './logger';
import { getTraceContext } from './context';
import { AuditLogModel } from '../models/audit-log.schema';

export interface AuditLogPayload {
  action: string;
  actor?: {
    type: 'user' | 'admin' | 'system' | 'guest';
    id?: string;
  };
  status: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
  description?: string;
}

export function auditLog(payload: AuditLogPayload) {
  const context = getTraceContext();
  const logData = {
    action: payload.action,
    actor: payload.actor || (context ? {
      type: context.userId ? 'user' : context.sessionId ? 'guest' : 'system',
      id: context.userId || context.sessionId,
    } : { type: 'system' }),
    status: payload.status,
    metadata: payload.metadata,
    description: payload.description,
    correlationId: context?.correlationId,
  };

  logger.info({ audit: true, ...logData }, `[AUDIT] ${payload.action}: ${payload.description || ''}`);

  // Asynchronously save to MongoDB AuditLog collection
  AuditLogModel.create(logData).catch((err) => {
    logger.error({ err }, 'Failed to persist audit log to MongoDB');
  });
}
