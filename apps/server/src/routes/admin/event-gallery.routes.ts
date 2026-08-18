import { Router } from 'express';

import { AdminRole } from '@mad/shared';
import {
  addGalleryItemsSchema,
  reorderGalleryItemsSchema,
  updateGalleryItemSchema,
  updateGallerySettingsSchema,
} from '@mad/validations';

import * as eventGalleryController from '../../controllers/admin/event-gallery.controller';
import { requireRole } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';

const router = Router({ mergeParams: true }); // Allows access to eventId from parent router

// All gallery routes require at least MANAGER access
router.use(requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER));

router.get('/', eventGalleryController.getGallery);

router.post('/items', validateBody(addGalleryItemsSchema), eventGalleryController.addItems);

router.put('/items/reorder', validateBody(reorderGalleryItemsSchema), eventGalleryController.reorderItems);

router.patch('/items/:itemId/cover', eventGalleryController.setCover);

router.patch('/items/:itemId', validateBody(updateGalleryItemSchema), eventGalleryController.updateItem);

router.delete('/items/:itemId', eventGalleryController.deleteItem);

router.patch('/settings', validateBody(updateGallerySettingsSchema), eventGalleryController.updateSettings);

export default router;
