import { Router } from 'express';

import {
  getConsistencyDiagnostics,
  listReservations,
  repairConsistency,
  getSystemDiagnostics,
  retryFailedJob,
  retryAllFailedJobs,
} from '../../controllers/admin/diagnostics.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

router.use(requireAdmin);
router.get('/consistency', getConsistencyDiagnostics);
router.post('/consistency/repair', repairConsistency);
router.get('/reservations', listReservations);
router.get('/system', getSystemDiagnostics);
router.post('/dlq/:id/retry', retryFailedJob);
router.post('/dlq/retry-all', retryAllFailedJobs);

export default router;
