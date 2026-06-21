import { beforeEach, describe, expect, it, vi } from 'vitest';
import qrcode from 'qrcode';

import { BookingStatus } from '@mad/shared';
import { AppError } from '../../middleware/error.middleware';
import { Booking } from '../../models/booking.schema';
import { Ticket } from '../../models/ticket.schema';
import { getTicketQR, assignTicket, claimTicket, revokeTicket, getMyTickets } from './ticket.controller';
import { canViewTicketQR } from '../../services/public/ticket-ownership.service';
import * as ticketService from '../../services/public/ticket.service';

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(),
  },
}));

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../../services/public/ticket-ownership.service', () => ({
  canViewTicketQR: vi.fn(),
}));

vi.mock('../../services/public/ticket.service', () => ({
  assignTicket: vi.fn(),
  claimTicket: vi.fn(),
  revokeTicket: vi.fn(),
  getAttendeeTickets: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockRequest = (params = {}, body = {}, user = {}, session = {}) => {
  return {
    params,
    body,
    user,
    session,
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
    vi.mocked(canViewTicketQR).mockResolvedValue(true);
  });

  it('should successfully return PNG buffer with caching headers for a valid ticket and confirmed booking', async () => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-ABCDE-001',
      qrCode: 'validation_hash_123',
      bookingId: 'booking123',
      status: 'active',
    };

    const mockBooking = {
      _id: 'booking123',
      status: BookingStatus.CONFIRMED,
    };

    const mockBuffer = Buffer.from('mocked_png_binary_data');
    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);
    vi.mocked(Booking.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockBooking),
    } as any);
    vi.mocked(qrcode.toBuffer).mockResolvedValue(mockBuffer as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(Ticket.findOne).toHaveBeenCalledWith({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
    expect(Booking.findById).toHaveBeenCalledWith('booking123');
    expect(qrcode.toBuffer).toHaveBeenCalledWith('validation_hash_123', {
      type: 'png',
      margin: 1,
      width: 300,
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

  it('should throw notFound error if the ticket does not exist in DB', async () => {
    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const req = mockRequest({ ticketId: 'TKT-NONEXISTENT' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorArg = next.mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(404);
    expect(errorArg.message).toContain('Ticket not found');
  });

  it('should throw forbidden error if the ticket status is voided', async () => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-VOID',
      bookingId: 'booking123',
      status: 'voided',
    };

    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-VOID' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorArg = next.mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(403);
    expect(errorArg.message).toContain('Ticket is no longer active');
  });

  it('should throw forbidden error if the ticket status is replaced', async () => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-REPLACED',
      bookingId: 'booking123',
      status: 'replaced',
    };

    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-REPLACED' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorArg = next.mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(403);
    expect(errorArg.message).toContain('Ticket is no longer active');
  });

  it.each([
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.CANCELLED,
    BookingStatus.REFUNDED,
    BookingStatus.EXPIRED,
  ])('should throw forbidden error if the associated booking status is %s', async (status) => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-ABCDE-001',
      bookingId: 'booking123',
      status: 'active',
    };

    const mockBooking = {
      _id: 'booking123',
      status,
    };

    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);
    vi.mocked(Booking.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockBooking),
    } as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorArg = next.mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(403);
    expect(errorArg.message).toContain('Associated booking is not confirmed');
  });

  it('should throw notFound error if the associated booking is missing', async () => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-ABCDE-001',
      bookingId: 'booking123',
      status: 'active',
    };

    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);
    vi.mocked(Booking.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const errorArg = next.mock.calls[0][0] as AppError;
    expect(errorArg.statusCode).toBe(404);
    expect(errorArg.message).toContain('Associated booking not found');
  });

  describe('GET /api/public/tickets/:ticketId/qr visibility authorization tests', () => {
    it('throws forbidden if canViewTicketQR returns false', async () => {
      const mockTicket = {
        ticketId: 'TKT-MAD-2026-ABCDE-001',
        bookingId: 'booking123',
        status: 'active',
      };
      const mockBooking = {
        _id: 'booking123',
        status: BookingStatus.CONFIRMED,
      };

      vi.mocked(Ticket.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTicket),
      } as any);
      vi.mocked(Booking.findById).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockBooking),
      } as any);
      vi.mocked(canViewTicketQR).mockResolvedValue(false);

      const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
      const res = mockResponse();
      const next = vi.fn();

      await getTicketQR(req, res, next);

      expect(canViewTicketQR).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorArg = next.mock.calls[0][0] as AppError;
      expect(errorArg.statusCode).toBe(403);
      expect(errorArg.message).toContain('You do not have permission to view this QR code');
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
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { tickets: mockTickets } }));
    });
  });
});
