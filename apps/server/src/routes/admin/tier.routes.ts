import { Router } from 'express';
import * as tierController from '../../controllers/admin/tier.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { adminIdParamSchema, createTierSchema, updateTierSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', validate(createTierSchema), tierController.createTier);
router.get('/', tierController.getTiers);
router.patch('/:id', validate(updateTierSchema), tierController.updateTier);
router.delete('/:id', validate(adminIdParamSchema), tierController.deleteTier);

export default router;
