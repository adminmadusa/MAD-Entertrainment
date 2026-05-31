import { Router } from 'express';
import * as categoryController from '../../controllers/admin/category.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createCategorySchema, updateCategorySchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', validate(adminIdParamSchema), categoryController.deleteCategory);

export default router;
