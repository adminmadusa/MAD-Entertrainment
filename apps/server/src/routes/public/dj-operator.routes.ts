import { Router } from 'express';
import { listDJOperators, getDJOperatorBySlug } from '../../controllers/public/dj-operator.controller';
import { cdnCache } from '../../middleware/cache.middleware';
import { validateQuery } from '../../middleware/validation.middleware';
import { listDJOperatorsQuerySchema } from '../../validations/payment.validation';

const router: Router = Router();

router.get('/', validateQuery(listDJOperatorsQuerySchema), cdnCache(60, 120), listDJOperators);
router.get('/:slug', cdnCache(60, 300), getDJOperatorBySlug);

export default router;
