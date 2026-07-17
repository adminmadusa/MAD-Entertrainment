import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import * as eventController from '../../controllers/admin/event.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminEventsQuerySchema, adminIdParamSchema, createEventSchema, updateEventSchema } from '../../validations/event.validation';
import { adminBulkIdsSchema } from '../../validations/admin-content.validation';

import eventGalleryRouter from './event-gallery.routes';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createEventSchema), eventController.createEvent);
router.get('/', validate(adminEventsQuerySchema), eventController.getEvents);
router.get('/:id', validate(adminIdParamSchema), eventController.getEventById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updateEventSchema), eventController.updateEvent);

router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), eventController.deleteEvent);
router.post('/bulk/delete', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminBulkIdsSchema), eventController.bulkDeleteEvents);

router.use('/:eventId/gallery', eventGalleryRouter);

export default router;
