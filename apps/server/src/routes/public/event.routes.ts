import { Router } from 'express';

import { listEvents, getEventBySlug, getEventSeatLayout } from '../../controllers/public/event.controller';
import { cdnCache } from '../../middleware/cache.middleware';
import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listEventsQuerySchema, getEventSeatLayoutParamSchema } from '../../validations/payment.validation';

const router: Router = Router();

router.get('/', validateQuery(listEventsQuerySchema), cdnCache(60, 300), listEvents);
router.get('/:slug', cdnCache(60, 600), getEventBySlug);
router.get('/:eventId/seats', validateParams(getEventSeatLayoutParamSchema), getEventSeatLayout);

export default router;
