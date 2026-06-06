import { Router } from 'express';
import { AdminRole } from '@mad/shared';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import * as analyticsController from '../../controllers/admin/analytics.controller';

const router: Router = Router();

// Require admin for all analytics routes
router.use(requireAdmin);

router.get('/summary', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), analyticsController.getSummary);
router.get('/revenue', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), analyticsController.getRevenue);
router.get('/attendance/summary', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), analyticsController.getAttendanceSummary);
router.get('/attendance/rankings', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), analyticsController.getAttendanceRankings);

export default router;
