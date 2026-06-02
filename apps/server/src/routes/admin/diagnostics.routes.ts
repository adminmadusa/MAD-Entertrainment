import { Router } from 'express';
import { AdminRole } from '@mad/shared';

import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  retryFailedJob,
  retryAllFailedJobs,
} from '../../controllers/admin/diagnostics.controller';
import { requireAdmin, requireSuperAdmin, requireRole } from '../../middleware/auth.middleware';

import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listReservationsQuerySchema, retryFailedJobParamSchema } from '../../validations/payment.validation';

const router: Router = Router();

router.use(requireAdmin);
router.get('/consistency', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), getConsistencyDiagnostics);
router.post('/consistency/repair', requireSuperAdmin, repairConsistency);
router.get('/reservations', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), validateQuery(listReservationsQuerySchema), listReservations);
router.get('/system', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), getSystemDiagnostics);
router.post('/dlq/:id/retry', requireSuperAdmin, validateParams(retryFailedJobParamSchema), retryFailedJob);
router.post('/dlq/retry-all', requireSuperAdmin, retryAllFailedJobs);

export default router;
