import { Router } from 'express';
import * as teamController from '../../controllers/admin/team.controller';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema } from '../../validations/admin-content.validation';
import { createAdminSchema, updateAdminSchema, updateAdminRoleSchema, resetAdminPasswordSchema } from '../../validations/admin.validation';

const router: Router = Router();

// All team routes require administrator authentication
router.use(requireAdmin);

router.get('/', requireSuperAdmin, teamController.getAdmins);
router.post('/', requireSuperAdmin, validate(createAdminSchema), teamController.createAdmin);
router.patch('/:id/toggle', requireSuperAdmin, validate(adminIdParamSchema), teamController.toggleAdminActive);
router.patch('/:id', requireSuperAdmin, validate(adminIdParamSchema), validate(updateAdminSchema), teamController.updateAdmin);
router.patch('/:id/role', requireSuperAdmin, validate(adminIdParamSchema), validate(updateAdminRoleSchema), teamController.updateAdminRole);
router.post('/:id/reset-password', requireSuperAdmin, validate(adminIdParamSchema), validate(resetAdminPasswordSchema), teamController.resetAdminPassword);

export default router;
