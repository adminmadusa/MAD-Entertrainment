import { beforeEach, describe, expect, it, vi } from 'vitest';
import qrcode from 'qrcode';

import { AppError } from '../../middleware/error.middleware';
import { Ticket } from '../../models/ticket.schema';
import { getTicketQR } from './ticket.controller';

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

vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockRequest = (params = {}) => {
  return {
    params,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

describe('Public Ticket QR Controller Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully return PNG buffer with caching headers for a valid ticket', async () => {
    const mockTicket = {
      ticketId: 'TKT-MAD-2026-ABCDE-001',
      qrCode: 'validation_hash_123',
    };

    const mockBuffer = Buffer.from('mocked_png_binary_data');
    vi.mocked(Ticket.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockTicket),
    } as any);
    vi.mocked(qrcode.toBuffer).mockResolvedValue(mockBuffer as any);

    const req = mockRequest({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
    const res = mockResponse();
    const next = vi.fn();

    await getTicketQR(req, res, next);

    expect(Ticket.findOne).toHaveBeenCalledWith({ ticketId: 'TKT-MAD-2026-ABCDE-001' });
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
});
