import { Router } from 'express';

import { getGallery } from '../../controllers/public/event-gallery.controller';
import { listEvents, getEventBySlug, getEventSeatLayout } from '../../controllers/public/event.controller';
import { cdnCache } from '../../middleware/cache.middleware';
import { validateQuery, validateParams } from '../../middleware/validation.middleware';
import { listEventsQuerySchema, getEventSeatLayoutParamSchema } from '../../validations/event.validation';

const router: Router = Router();

router.get('/', validateQuery(listEventsQuerySchema), cdnCache(60, 300), listEvents);
router.get('/:slug', cdnCache(60, 600), getEventBySlug);
router.get('/:slug/gallery', cdnCache(60, 600), getGallery);
router.get('/:eventId/seats', validateParams(getEventSeatLayoutParamSchema), getEventSeatLayout);

export default router;
