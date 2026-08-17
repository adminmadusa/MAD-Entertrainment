import { Router, Request, Response, NextFunction } from 'express';

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

/**
 * Standard deprecation header middleware for legacy unconsumed endpoints.
 */
const deprecatedEndpointNotice = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Deprecation', '@deprecated');
  res.setHeader('Sunset', '2026-12-31');
  next();
};

/**
 * GET /api/public/tickets/my-tickets
 * @deprecated Prefer authenticated user ticket endpoint: GET /api/users/tickets
 */
router.get('/my-tickets', deprecatedEndpointNotice, requireAuth as any, generalLimiter as any, getMyTickets);

// GET /api/public/tickets/:ticketId/qr
router.get('/:ticketId/qr', optionalAuth as any, generalLimiter as any, getTicketQR);

/**
 * POST /api/public/tickets/:ticketId/assign
 * @deprecated Unused legacy ticket assignment route.
 */
router.post('/:ticketId/assign', deprecatedEndpointNotice, requireAuth as any, ticketAssignLimiter as any, assignTicket);

/**
 * POST /api/public/tickets/:ticketId/claim
 * @deprecated Unused legacy ticket claim route.
 */
router.post('/:ticketId/claim', deprecatedEndpointNotice, requireAuth as any, ticketClaimLimiter as any, claimTicket);

/**
 * POST /api/public/tickets/:ticketId/revoke
 * @deprecated Unused legacy ticket revoke route.
 */
router.post('/:ticketId/revoke', deprecatedEndpointNotice, requireAuth as any, ticketRevokeLimiter as any, revokeTicket);

export default router;
