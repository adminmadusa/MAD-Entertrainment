import { Router } from 'express';

import { AdminRole } from '@mad/shared';

import { MarketingController } from '../../controllers/admin/marketing.controller';
import { requireAdmin, requireRole } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin session
router.use(requireAdmin);

// Require SUPER_ADMIN or ADMIN to send marketing campaigns
router.post(
  '/send',
  requireRole(AdminRole.SUPER_ADMIN, AdminRole.ADMIN),
  MarketingController.sendCampaign
);

export default router;
