import { Router } from 'express';
import { requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { AdminRole } from '@mad/shared';
import * as eventGalleryController from '../../controllers/admin/event-gallery.controller';
import {
  addGalleryItemsSchema,
  updateGalleryItemSchema,
  reorderGalleryItemsSchema,
  updateGallerySettingsSchema,
  setCoverImageSchema
} from '@mad/validations';

const router = Router({ mergeParams: true }); // Allows access to eventId from parent router

// All gallery routes require at least MANAGER access
router.use(requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER));

router.get('/', eventGalleryController.getGallery);

router.post('/items', validate(addGalleryItemsSchema), eventGalleryController.addItems);

router.patch('/items/order', validate(reorderGalleryItemsSchema), eventGalleryController.reorderItems);

router.patch('/items/:itemId/cover', validate(setCoverImageSchema), eventGalleryController.setCover);

router.patch('/items/:itemId', validate(updateGalleryItemSchema), eventGalleryController.updateItem);

router.delete('/items/:itemId', eventGalleryController.deleteItem);

router.patch('/settings', validate(updateGallerySettingsSchema), eventGalleryController.updateSettings);

export default router;
