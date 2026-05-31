import { Router } from 'express';
import * as notificationController from '../../controllers/admin/notification.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.get('/', notificationController.getNotifications);
router.post('/:id/retry', validate(adminIdParamSchema), notificationController.retryNotification);

export default router;
