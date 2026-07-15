import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as notificationController from '../../controllers/admin/notification.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.get('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT), notificationController.getNotifications);
router.post('/:id/retry', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT), validate(adminIdParamSchema), notificationController.retryNotification);

export default router;
