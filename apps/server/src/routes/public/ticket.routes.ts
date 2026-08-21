import { Router } from 'express';

import { getTicketQR } from '../../controllers/public/ticket.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { generalLimiter } from '../../middleware/rate.middleware';

const router: Router = Router();

// GET /api/public/tickets/:ticketId/qr
router.get('/:ticketId/qr', optionalAuth as any, generalLimiter as any, getTicketQR);

export default router;
