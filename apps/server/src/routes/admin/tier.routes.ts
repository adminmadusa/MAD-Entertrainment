import { Router } from 'express';
import * as tierController from '../../controllers/admin/tier.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/', tierController.createTier);
router.get('/', tierController.getTiers);
router.patch('/:id', tierController.updateTier);
router.delete('/:id', tierController.deleteTier);

export default router;
