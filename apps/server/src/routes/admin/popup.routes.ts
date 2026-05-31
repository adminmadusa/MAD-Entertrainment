import { Router } from 'express';
import * as popupController from '../../controllers/admin/popup.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createPopupSchema, updatePopupSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All administrative popup routes require administrator credentials
router.use(requireAdmin);

router.post('/', validate(createPopupSchema), popupController.createPopup);
router.get('/', popupController.getPopups);
router.get('/:id', validate(adminIdParamSchema), popupController.getPopupById);
router.put('/:id', validate(updatePopupSchema), popupController.updatePopup);
router.delete('/:id', validate(adminIdParamSchema), popupController.deletePopup);
router.patch('/:id/toggle', validate(adminIdParamSchema), popupController.togglePopup);

export default router;
