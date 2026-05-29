import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.middleware';
import * as analyticsController from '../../controllers/admin/analytics.controller';

const router: Router = Router();

// Require admin for all analytics routes
router.use(requireAdmin);

router.get('/summary', analyticsController.getSummary);
router.get('/revenue', analyticsController.getRevenue);
router.get('/attendance/summary', analyticsController.getAttendanceSummary);
router.get('/attendance/rankings', analyticsController.getAttendanceRankings);

export default router;
