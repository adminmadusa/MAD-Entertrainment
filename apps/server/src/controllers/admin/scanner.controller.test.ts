import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { lookupTickets, scanTicket } from './scanner.controller';
import { Ticket } from '../../models/ticket.schema';
import { Booking } from '../../models/booking.schema';

vi.mock('../../models/ticket.schema', () => ({
  Ticket: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../models/booking.schema', () => ({
  Booking: {
    findOne: vi.fn(),
    findById: vi.fn(),
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

describe('scanTicket', () => {
  const mockScannerId = new Types.ObjectId().toString();
  const mockEventId = new Types.ObjectId().toString();
  const mockBookingId = new Types.ObjectId();
  const mockTicketId = 'TKT-MAD-2026-00001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if ticketId or eventId is missing', async () => {
    const req = {
      body: { ticketId: '', eventId: '' },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('required') })
    );
  });

  it('returns 401 if admin context or sub is missing', async () => {
    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('identity is missing') })
    );
  });

  it('returns 404 if ticket does not exist', async () => {
    vi.mocked(Ticket.findOne).mockResolvedValue(null);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Invalid ticket reference: Ticket not found.' })
    );
  });

  it('returns 400 if ticket eventId does not match requested eventId', async () => {
    vi.mocked(Ticket.findOne).mockResolvedValue({
      ticketId: mockTicketId,
      eventId: new Types.ObjectId().toString(),
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('different event') })
    );
  });

  it('returns 400 if ticket has already been scanned', async () => {
    vi.mocked(Ticket.findOne).mockResolvedValue({
      ticketId: mockTicketId,
      eventId: mockEventId,
      scannedAt: new Date(),
      status: 'active',
      assignmentStatus: 'unassigned',
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('already used') })
    );
  });

  it('returns 404 if associated booking is not found', async () => {
    vi.mocked(Ticket.findOne).mockResolvedValue({
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'unassigned',
    } as any);
    vi.mocked(Booking.findById).mockResolvedValue(null);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Associated booking not found') })
    );
  });

  it('returns 400 if booking is not in confirmed status', async () => {
    vi.mocked(Ticket.findOne).mockResolvedValue({
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'unassigned',
    } as any);
    vi.mocked(Booking.findById).mockResolvedValue({
      _id: mockBookingId,
      status: 'pending',
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Only confirmed bookings') })
    );
  });

  it('successfully scans and attributes ticket to the scanner on success', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'unassigned',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
    vi.mocked(Booking.findById).mockResolvedValue({
      _id: mockBookingId,
      status: 'confirmed',
    } as any);

    const scannedDate = new Date();
    vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({
      ...mockTicket,
      scannedAt: scannedDate,
      scannedById: new Types.ObjectId(mockScannerId),
      tierName: 'VIP',
      admits: 2,
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(Ticket.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: mockTicket._id,
        status: 'active',
        $or: [{ scannedAt: { $exists: false } }, { scannedAt: null }]
      },
      { $set: { scannedAt: expect.any(Date), scannedById: new Types.ObjectId(mockScannerId) } },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Ticket scanned and verified successfully.',
      data: {
        ticketId: mockTicketId,
        tierName: 'VIP',
        admits: 2,
        scannedAt: scannedDate.toISOString(),
      },
    });
  });

  it('handles concurrent scans and reports ticket already scanned', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'unassigned',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
    vi.mocked(Booking.findById).mockResolvedValue({
      _id: mockBookingId,
      status: 'confirmed',
    } as any);

    vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue(null);

    const scannedDate = new Date();
    vi.mocked(Ticket.findById).mockResolvedValue({
      ...mockTicket,
      scannedAt: scannedDate,
      scannedById: new Types.ObjectId(mockScannerId),
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('already used'),
        details: { scannedAt: scannedDate.toISOString() },
      })
    );
  });

  it('allows unassigned entry', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'unassigned',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
    vi.mocked(Booking.findById).mockResolvedValue({
      _id: mockBookingId,
      status: 'confirmed',
    } as any);

    const scannedDate = new Date();
    vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({
      ...mockTicket,
      scannedAt: scannedDate,
      scannedById: new Types.ObjectId(mockScannerId),
      tierName: 'VIP',
      admits: 1,
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('allows claimed entry', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'claimed',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);
    vi.mocked(Booking.findById).mockResolvedValue({
      _id: mockBookingId,
      status: 'confirmed',
    } as any);

    const scannedDate = new Date();
    vi.mocked(Ticket.findOneAndUpdate).mockResolvedValue({
      ...mockTicket,
      scannedAt: scannedDate,
      scannedById: new Types.ObjectId(mockScannerId),
      tierName: 'VIP',
      admits: 1,
    } as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects pending entry', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'active',
      assignmentStatus: 'pending',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ticket is not valid for entry' })
    );
  });

  it('rejects voided entry', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'voided',
      assignmentStatus: 'unassigned',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ticket is not valid for entry' })
    );
  });

  it('rejects replaced entry', async () => {
    const mockTicket = {
      _id: new Types.ObjectId(),
      ticketId: mockTicketId,
      eventId: mockEventId,
      bookingId: mockBookingId,
      status: 'replaced',
      assignmentStatus: 'unassigned',
    };
    vi.mocked(Ticket.findOne).mockResolvedValue(mockTicket as any);

    const req = {
      body: { ticketId: mockTicketId, eventId: mockEventId },
      admin: { sub: mockScannerId, email: 'scanner@mad.com', role: 'scanner' },
    } as unknown as Request;
    const res = makeRes();

    await scanTicket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ticket is not valid for entry' })
    );
  });
});
