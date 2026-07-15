import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as eventController from '../../controllers/admin/event.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminEventsQuerySchema, adminIdParamSchema, createEventSchema, updateEventSchema, adminBulkIdsSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createEventSchema), eventController.createEvent);
router.get('/', validate(adminEventsQuerySchema), eventController.getEvents);
router.get('/:id', validate(adminIdParamSchema), eventController.getEventById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updateEventSchema), eventController.updateEvent);
router.post('/:id/preview-token', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), eventController.getPreviewToken);
router.post('/:id/duplicate', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), eventController.duplicateEvent);
router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), eventController.deleteEvent);
router.post('/bulk/delete', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminBulkIdsSchema), eventController.bulkDeleteEvents);

export default router;
