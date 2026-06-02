import { Router } from 'express';
import { AdminRole } from '@mad/shared';
import * as djOperatorController from '../../controllers/admin/dj-operator.controller';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createDJOperatorSchema, updateDJOperatorSchema } from '../../validations/admin-content.validation';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(createDJOperatorSchema), djOperatorController.createDJOperator);
router.get('/', djOperatorController.getDJOperators);
router.get('/:id', validate(adminIdParamSchema), djOperatorController.getDJOperatorById);
router.put('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(updateDJOperatorSchema), djOperatorController.updateDJOperator);
router.delete('/:id', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER), validate(adminIdParamSchema), djOperatorController.deleteDJOperator);

export default router;
