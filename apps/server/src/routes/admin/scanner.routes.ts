import { Router } from 'express';
import * as scannerController from '../../controllers/admin/scanner.controller';
import { requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { scannerLookupSchema, scannerScanSchema } from '../../validations/admin-content.validation';

const router: Router = Router();

// All routes require admin
router.use(requireAdmin);

router.get('/lookup/:reference', validate(scannerLookupSchema), scannerController.lookupTickets);
router.post('/scan', validate(scannerScanSchema), scannerController.scanTicket);

export default router;
