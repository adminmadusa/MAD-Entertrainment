import { Router } from 'express';
import * as teamController from '../../controllers/admin/team.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All team routes require administrator authentication
router.use(requireAdmin);

router.get('/', teamController.getAdmins);
router.post('/', teamController.createAdmin);
router.patch('/:id/toggle', teamController.toggleAdminActive);

export default router;
