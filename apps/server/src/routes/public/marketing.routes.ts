import { Router } from 'express';
import { MarketingController } from '../../controllers/public/marketing.controller';

const router: Router = Router();

router.get('/unsubscribe', MarketingController.unsubscribe);

export default router;
