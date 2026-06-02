import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { lookupTickets } from './scanner.controller';
import { Ticket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findOne: vi.fn(),
  },
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const eventId = new Types.ObjectId().toString();
const bookingObjectId = new Types.ObjectId();

function makeReq(reference: string, eid = eventId) {
  return {
    params: { reference },
    query: { eventId: eid },
  } as unknown as Request;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const next: NextFunction = vi.fn();

// ─────────────────────────────────────────────────────────────
// lookupTickets — by MAD- booking reference
// ─────────────────────────────────────────────────────────────

describe('lookupTickets — queue lag scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when booking reference does not exist', async () => {
    vi.mocked(Booking.findOne).mockResolvedValue(null);

    const req = makeReq('MAD-2026-ABCDE');
    const res = makeRes();

    await lookupTickets(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Booking reference not found.' })
    );
  });

  it('returns 202 with { status: "generating" } when booking is confirmed but tickets are not yet generated', async () => {
    vi.mocked(Booking.findOne).mockResolvedValue({
      _id: bookingObjectId,
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'Test Guest',
      status: 'confirmed',
    } as any);

    // No tickets yet — worker hasn't run
    vi.mocked(Ticket.find).mockResolvedValue([] as any);

    const req = makeReq('MAD-2026-ABCDE');
    const res = makeRes();

    await lookupTickets(req, res, next);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'generating',
        message: expect.stringContaining('being generated'),
      })
    );
  });

  it('returns 404 when booking is NOT confirmed and tickets are empty (non-generating state)', async () => {
    vi.mocked(Booking.findOne).mockResolvedValue({
      _id: bookingObjectId,
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'Test Guest',
      status: 'awaiting_payment',
    } as any);

    vi.mocked(Ticket.find).mockResolvedValue([] as any);

    const req = makeReq('MAD-2026-ABCDE');
    const res = makeRes();

    await lookupTickets(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No tickets found for this booking for the selected event.' })
    );
  });

  it('returns 200 with ticket data when booking is confirmed and tickets are fully generated', async () => {
    vi.mocked(Booking.findOne).mockResolvedValue({
      _id: bookingObjectId,
      bookingId: 'MAD-2026-ABCDE',
      guestName: 'Test Guest',
      status: 'confirmed',
    } as any);

    const tickets = [
      { ticketId: 'TKT-MAD-2026-ABCDE-001', tierName: 'General', admits: 1, scannedAt: null },
      { ticketId: 'TKT-MAD-2026-ABCDE-002', tierName: 'General', admits: 1, scannedAt: null },
    ];
    vi.mocked(Ticket.find).mockResolvedValue(tickets as any);

    const req = makeReq('MAD-2026-ABCDE');
    const res = makeRes();

    await lookupTickets(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          tickets: expect.arrayContaining([
            expect.objectContaining({ ticketId: 'TKT-MAD-2026-ABCDE-001' }),
          ]),
        }),
      })
    );
  });
});
