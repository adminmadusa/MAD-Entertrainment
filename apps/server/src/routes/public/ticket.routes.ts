import { Router } from 'express';

import {
  getTicketQR,
  assignTicket,
  claimTicket,
  revokeTicket,
  getMyTickets,
} from '../../controllers/public/ticket.controller';
import {
  requireAuth,
  optionalAuth,
} from '../../middleware/auth.middleware';
import {
  generalLimiter,
  ticketAssignLimiter,
  ticketClaimLimiter,
  ticketRevokeLimiter,
} from '../../middleware/rate.middleware';

const router: Router = Router();

// GET /api/public/tickets/my-tickets
router.get('/my-tickets', requireAuth as any, generalLimiter as any, getMyTickets);

// GET /api/public/tickets/:ticketId/qr
router.get('/:ticketId/qr', optionalAuth as any, generalLimiter as any, getTicketQR);

// POST /api/public/tickets/:ticketId/assign
router.post('/:ticketId/assign', requireAuth as any, ticketAssignLimiter as any, assignTicket);

// POST /api/public/tickets/:ticketId/claim
router.post('/:ticketId/claim', requireAuth as any, ticketClaimLimiter as any, claimTicket);

// POST /api/public/tickets/:ticketId/revoke
router.post('/:ticketId/revoke', requireAuth as any, ticketRevokeLimiter as any, revokeTicket);

export default router;
