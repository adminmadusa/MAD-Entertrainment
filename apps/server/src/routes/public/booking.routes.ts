import { Router } from 'express';

import { createBooking, getBooking, getMyBookings, getSessionToken } from '../../controllers/public/booking.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';

const router: Router = Router();

router.get('/session', getSessionToken);
router.post('/', optionalAuth, createBooking);
router.get('/me', requireAuth, getMyBookings);
router.get('/:bookingId', optionalAuth, getBooking);

export default router;
