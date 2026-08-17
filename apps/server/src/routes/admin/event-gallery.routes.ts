import { Router } from 'express';

import { AdminRole } from '@mad/shared';
import {
  addGalleryItemsSchema,
  updateGallerySettingsSchema
} from '@mad/validations';

import * as eventGalleryController from '../../controllers/admin/event-gallery.controller';
import { requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const router = Router({ mergeParams: true }); // Allows access to eventId from parent router

// All gallery routes require at least MANAGER access
router.use(requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER));

router.get('/', eventGalleryController.getGallery);

router.post('/items', validate(addGalleryItemsSchema), eventGalleryController.addItems);

router.patch('/settings', validate(updateGallerySettingsSchema), eventGalleryController.updateSettings);

export default router;
