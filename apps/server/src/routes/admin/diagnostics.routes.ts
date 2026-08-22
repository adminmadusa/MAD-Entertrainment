import { Router } from 'express';

import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  listDeadLetterJobs,
  getDeadLetterJob,
  retryFailedJob,
  retryAllFailedJobs,
  getQueuesStatus,
  pauseQueueHandler,
  resumeQueueHandler,
  drainQueueHandler,
  listEmailTemplates,
  previewEmailTemplate,
} from '../../controllers/admin/diagnostics.controller';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';
import { adminLimiter } from '../../middleware/rate.middleware';
import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listDlqQuerySchema } from '../../validations/diagnostics.validation';
import { listReservationsQuerySchema, retryFailedJobParamSchema } from '../../validations/payment.validation';
import { queueNameParamSchema } from '../../validations/queue.validation';

const router: Router = Router();

router.use(requireAdmin);

// Consistency & Reservations (restricted to SuperAdmin)
router.get('/consistency', requireSuperAdmin, getConsistencyDiagnostics);
router.post('/consistency/repair', requireSuperAdmin, repairConsistency);
router.get('/reservations', requireSuperAdmin, validateQuery(listReservationsQuerySchema), listReservations);

// General health diagnostics (accessible to SuperAdmin only)
router.get('/system', requireSuperAdmin, getSystemDiagnostics);

// Dead Letter Queue management
router.get('/dlq', requireSuperAdmin, validateQuery(listDlqQuerySchema), listDeadLetterJobs);
router.get('/dlq/:id', adminLimiter, requireSuperAdmin, validateParams(retryFailedJobParamSchema), getDeadLetterJob);
router.post('/dlq/:id/retry', adminLimiter, requireSuperAdmin, validateParams(retryFailedJobParamSchema), retryFailedJob);
router.post('/dlq/retry-all', adminLimiter, requireSuperAdmin, retryAllFailedJobs);

// Queue Controls
// GET  /queues         — SUPER_ADMIN only
// POST /queues/:name/* — SUPER_ADMIN only (mutations)
router.get('/queues', requireSuperAdmin, getQueuesStatus);
router.post('/queues/:name/pause', requireSuperAdmin, validateParams(queueNameParamSchema), pauseQueueHandler);
router.post('/queues/:name/resume', requireSuperAdmin, validateParams(queueNameParamSchema), resumeQueueHandler);
router.post('/queues/:name/drain', requireSuperAdmin, validateParams(queueNameParamSchema), drainQueueHandler);

// Email Templates Gallery & Live Preview (SUPER_ADMIN only)
router.get('/email-templates', requireSuperAdmin, listEmailTemplates);
router.get('/email-templates/:templateId/preview', requireSuperAdmin, previewEmailTemplate);

export default router;
