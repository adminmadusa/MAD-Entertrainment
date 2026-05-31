import { Router } from 'express';
import { AdminRole } from '@mad/shared';
import * as refundController from '../../controllers/admin/refund.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), refundController.createRefund);
router.get('/', refundController.getRefunds);
router.patch('/:id/process', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), refundController.processRefund);

export default router;
