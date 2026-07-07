import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as popupController from '../../controllers/admin/popup.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createPopupSchema, updatePopupSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All administrative popup routes require administrator credentials
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createPopupSchema), popupController.createPopup);
router.get('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), popupController.getPopups);
router.get('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), validate(adminIdParamSchema), popupController.getPopupById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updatePopupSchema), popupController.updatePopup);
router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), popupController.deletePopup);
router.patch('/:id/toggle', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), popupController.togglePopup);

export default router;
