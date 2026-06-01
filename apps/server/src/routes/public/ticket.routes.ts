import { Router } from 'express';

import { getTicketQR } from '../../controllers/public/ticket.controller';
import { generalLimiter } from '../../middleware/rate.middleware';

const router: Router = Router();

// GET /api/public/tickets/:ticketId/qr
router.get('/:ticketId/qr', generalLimiter as any, getTicketQR);

export default router;
