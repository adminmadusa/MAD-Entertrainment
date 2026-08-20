import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'this_is_a_very_long_jwt_secret_with_more_than_32_characters';
  process.env.JWT_ADMIN_SECRET = 'this_is_a_very_long_jwt_admin_secret_with_more_than_32_characters';
  process.env.JWT_SESSION_SECRET = 'this_is_a_very_long_jwt_session_secret_with_more_than_32_characters';
});

import { AppError } from '../../middleware/error.middleware';
import { generateAuthorizedTicketQR } from '../../services/public/ticket-ownership.service';
import * as ticketService from '../../services/public/ticket.service';
import { assignTicket, claimTicket, getMyTickets, getTicketQR, revokeTicket } from './ticket.controller';

vi.mock('../../services/public/ticket-ownership.service', () => ({
  generateAuthorizedTicketQR: vi.fn(),
  buildQrCodeImageUrl: vi.fn((ticketId) => `https://test.com/qr/${ticketId}`),
}));

vi.mock('../../services/public/ticket.service', () => ({
  assignTicket: vi.fn(),
  claimTicket: vi.fn(),
  revokeTicket: vi.fn(),
  getAttendeeTickets: vi.fn(),
}));

const mockRequest = (params = {}, body = {}, user = {}, session = {}, query = {}) => {
  return {
    params,
    body,
    user,
    session,
    query,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Public Ticket QR Controller Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/public/tickets/:ticketId/qr', () => {
    it('successfully returns PNG buffer with caching headers for a valid ticketId', async () => {
      const mockBuffer = Buffer.from('mocked_png_binary_data');
      vi.mocked(generateAuthorizedTicketQR).mockResolvedValue(mockBuffer as any);

      const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' }, {}, { sub: 'u1' }, { sessionId: 's1' }, { token: 'tok123' });
      const res = mockResponse();
      const next = vi.fn();

      await getTicketQR(req, res, next);

      expect(generateAuthorizedTicketQR).toHaveBeenCalledWith('TKT-MAD-2026-ABCDE-001', {
        token: 'tok123',
        userId: 'u1',
        sessionId: 's1',
      });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw badRequest error if ticketId is missing from parameters', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = vi.fn();

      await getTicketQR(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(400);
      expect(errorArg.message).toContain('Ticket ID is required');
    });

    it('should forward service errors to next()', async () => {
      vi.mocked(generateAuthorizedTicketQR).mockRejectedValue(AppError.forbidden('Forbidden error'));

      const req = mockRequest({ ticketId: 'TKT-1' });
      const res = mockResponse();
      const next = vi.fn();

      await getTicketQR(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(403);
    });
  });

  describe('POST /api/public/tickets/:ticketId/assign controller tests', () => {
    it('successfully calls ticketService.assignTicket', async () => {
      const req = mockRequest({ ticketId: 't1' }, { email: 'guest@mad.com' }, { sub: 'u1' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.assignTicket).mockResolvedValue();

      await assignTicket(req, res, next);

      expect(ticketService.assignTicket).toHaveBeenCalledWith('t1', 'u1', 'guest@mad.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Ticket assigned successfully' }));
    });

    it('throws badRequest if email is missing', async () => {
      const req = mockRequest({ ticketId: 't1' }, {}, { sub: 'u1' });
      const res = mockResponse();
      const next = vi.fn();

      await assignTicket(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(400);
    });

    it('rejects assignment for non-confirmed bookings (cancelled, refunded, failed)', async () => {
      const req = mockRequest({ ticketId: 't1' }, { email: 'guest@mad.com' }, { sub: 'u1' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.assignTicket).mockRejectedValue(
        AppError.badRequest('Cannot assign tickets for a non-confirmed booking.')
      );

      await assignTicket(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(400);
      expect(errorArg.message).toBe('Cannot assign tickets for a non-confirmed booking.');
    });
  });

  describe('POST /api/public/tickets/:ticketId/claim controller tests', () => {
    it('successfully claims ticket', async () => {
      const req = mockRequest({ ticketId: 't1' }, {}, { sub: 'u2', email: 'guest@mad.com' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.claimTicket).mockResolvedValue();

      await claimTicket(req, res, next);

      expect(ticketService.claimTicket).toHaveBeenCalledWith('t1', 'u2', 'guest@mad.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Ticket claimed successfully' }));
    });

    it('rejects claiming for non-confirmed bookings (cancelled, refunded, failed)', async () => {
      const req = mockRequest({ ticketId: 't1' }, {}, { sub: 'u2', email: 'guest@mad.com' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.claimTicket).mockRejectedValue(
        AppError.badRequest('Cannot claim tickets for a non-confirmed booking.')
      );

      await claimTicket(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(400);
      expect(errorArg.message).toBe('Cannot claim tickets for a non-confirmed booking.');
    });
  });

  describe('POST /api/public/tickets/:ticketId/revoke controller tests', () => {
    it('successfully revokes ticket', async () => {
      const req = mockRequest({ ticketId: 't1' }, {}, { sub: 'u1' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.revokeTicket).mockResolvedValue();

      await revokeTicket(req, res, next);

      expect(ticketService.revokeTicket).toHaveBeenCalledWith('t1', 'u1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Ticket reassignment reset successful' }));
    });

    it('rejects revocation for non-confirmed bookings (cancelled, refunded, failed)', async () => {
      const req = mockRequest({ ticketId: 't1' }, {}, { sub: 'u1' });
      const res = mockResponse();
      const next = vi.fn();

      vi.mocked(ticketService.revokeTicket).mockRejectedValue(
        AppError.badRequest('Cannot revoke tickets for a non-confirmed booking.')
      );

      await revokeTicket(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(400);
      expect(errorArg.message).toBe('Cannot revoke tickets for a non-confirmed booking.');
    });
  });

  describe('GET /api/public/tickets/my-tickets controller tests', () => {
    it('successfully returns attendee tickets', async () => {
      const req = mockRequest({}, {}, { sub: 'u2' });
      const res = mockResponse();
      const next = vi.fn();

      const mockTickets = [{ ticketId: 't1', attendeeUserId: 'u2' }];
      vi.mocked(ticketService.getAttendeeTickets).mockResolvedValue(mockTickets);

      await getMyTickets(req, res, next);

      expect(ticketService.getAttendeeTickets).toHaveBeenCalledWith('u2');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { tickets: expect.any(Array) } }));
    });
  });
});
