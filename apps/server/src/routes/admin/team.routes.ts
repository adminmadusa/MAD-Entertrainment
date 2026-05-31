import { Router } from 'express';
import * as teamController from '../../controllers/admin/team.controller';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All team routes require administrator authentication
router.use(requireAdmin);

router.get('/', requireSuperAdmin, teamController.getAdmins);
router.post('/', requireSuperAdmin, teamController.createAdmin);
router.patch('/:id/toggle', requireSuperAdmin, teamController.toggleAdminActive);

export default router;
