import { Router } from 'express';
import * as scannerController from '../../controllers/admin/scanner.controller';
import { requireAdmin } from '../../middleware/auth.middleware';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.post('/scan', scannerController.scanTicket);

export default router;
