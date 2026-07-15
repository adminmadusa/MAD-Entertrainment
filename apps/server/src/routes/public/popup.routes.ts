import { Router } from 'express';

import { getActivePopups } from '../../controllers/public/popup.controller';
import { cdnCache } from '../../middleware/cache.middleware';

const router: Router = Router();

router.get('/active', cdnCache(60, 300), getActivePopups);

export default router;
