import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import { getWebhooks } from '../../controllers/admin/webhook.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';
import { validateQuery } from '../../middleware/validation.middleware';
import { listWebhooksQuerySchema } from '../../validations/webhook.validation';

const router: Router = Router();

router.use(requireAdmin);
router.get('/', requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN), validateQuery(listWebhooksQuerySchema), getWebhooks);

export default router;
