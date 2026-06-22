import { Router } from 'express';

import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  retryFailedJob,
  retryAllFailedJobs,
<<<<<<< HEAD
  getQueuesStatus,
  pauseQueueHandler,
  resumeQueueHandler,
  drainQueueHandler,
} from '../../controllers/admin/diagnostics.controller';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';

import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listReservationsQuerySchema, retryFailedJobParamSchema } from '../../validations/payment.validation';
import { queueNameParamSchema } from '../../validations/queue.validation';
=======
  listDeadLetterJobs,
  getDeadLetterJob,
} from '../../controllers/admin/diagnostics.controller';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';
import { adminLimiter } from '../../middleware/rate.middleware';

import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listReservationsQuerySchema, retryFailedJobParamSchema } from '../../validations/payment.validation';
import { listDlqQuerySchema } from '../../validations/diagnostics.validation';
>>>>>>> develop

const router: Router = Router();

router.use(requireAdmin);

// Consistency & Reservations (restricted to SuperAdmin)
router.get('/consistency', requireSuperAdmin, getConsistencyDiagnostics);
router.post('/consistency/repair', requireSuperAdmin, repairConsistency);
router.get('/reservations', requireSuperAdmin, validateQuery(listReservationsQuerySchema), listReservations);

// General health diagnostics (accessible to Admin & SuperAdmin)
<<<<<<< HEAD
router.get('/system', requireSuperAdmin, getSystemDiagnostics);

// Dead Letter Queue management
router.post('/dlq/:id/retry', requireSuperAdmin, validateParams(retryFailedJobParamSchema), retryFailedJob);
router.post('/dlq/retry-all', requireSuperAdmin, retryAllFailedJobs);
=======
router.get('/system', getSystemDiagnostics);

// Dead Letter Queue management
router.get('/dlq', validateQuery(listDlqQuerySchema), listDeadLetterJobs);
router.get('/dlq/:id', adminLimiter, requireSuperAdmin, validateParams(retryFailedJobParamSchema), getDeadLetterJob);
router.post('/dlq/:id/retry', adminLimiter, requireSuperAdmin, validateParams(retryFailedJobParamSchema), retryFailedJob);
router.post('/dlq/retry-all', adminLimiter, requireSuperAdmin, retryAllFailedJobs);
>>>>>>> develop

// Queue Controls
// GET  /queues         — ADMIN + SUPER_ADMIN (read-only metrics + pause state)
// POST /queues/:name/* — SUPER_ADMIN only (mutations)
router.get('/queues', getQueuesStatus);
router.post('/queues/:name/pause',  requireSuperAdmin, validateParams(queueNameParamSchema), pauseQueueHandler);
router.post('/queues/:name/resume', requireSuperAdmin, validateParams(queueNameParamSchema), resumeQueueHandler);
router.post('/queues/:name/drain',  requireSuperAdmin, validateParams(queueNameParamSchema), drainQueueHandler);

export default router;
