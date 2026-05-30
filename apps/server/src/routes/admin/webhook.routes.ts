import { Router } from 'express';
import { getWebhooks } from '../../controllers/admin/webhook.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validateQuery } from '../../middleware/validation.middleware';
import { listWebhooksQuerySchema } from '../../validations/webhook.validation';

const router: Router = Router();

router.use(requireAdmin);
router.get('/', validateQuery(listWebhooksQuerySchema), getWebhooks);

export default router;
