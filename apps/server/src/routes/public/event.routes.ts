import { Router } from 'express';
import { listEvents, getEventBySlug, getEventSeatLayout } from '../../controllers/public/event.controller';
import { cdnCache } from '../../middleware/cache.middleware';

const router: Router = Router();

router.get('/', cdnCache(60, 300), listEvents);
router.get('/:slug', cdnCache(60, 600), getEventBySlug);
router.get('/:eventId/seats', getEventSeatLayout);

export default router;
