import { Router } from 'express';

import { createBooking, getBooking, getMyBookings } from '../../controllers/public/booking.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', optionalAuth, createBooking);
router.get('/me', requireAuth, getMyBookings);
router.get('/:bookingId', getBooking);

export default router;
