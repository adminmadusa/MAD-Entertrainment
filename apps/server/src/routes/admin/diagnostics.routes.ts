import { Router } from 'express';

import { getConsistencyDiagnostics, listReservations, repairConsistency } from '../../controllers/admin/diagnostics.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAdmin);
router.get('/consistency', getConsistencyDiagnostics);
router.post('/consistency/repair', repairConsistency);
router.get('/reservations', listReservations);

export default router;
