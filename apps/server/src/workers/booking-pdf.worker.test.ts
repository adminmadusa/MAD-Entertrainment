import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Notification } from '../models/notification.schema';
import { Ticket } from '../models/ticket.schema';
import { QueueService } from '../services/queue.service';
import { generateTicketPDF } from '../utils/pdf';
import { processBookingConfirm } from './booking.worker';
import { processPDFGenerate } from './pdf.worker';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    FRONTEND_URL: 'https://example.com',
    ALLOWED_ORIGINS: 'https://example.com',
  })),
}));

vi.mock('../models/booking.schema', () => ({
  Booking: {
    findById: vi.fn(),
  },
}));

vi.mock('../models/event.schema', () => ({
  Event: {
    findById: vi.fn(),
  },
}));

vi.mock('../models/ticket.schema', () => ({
  Ticket: {
    countDocuments: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../models/notification.schema', () => ({
  Notification: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../config/queue.config', () => ({
  getQueueConnection: () => ({}),
  getQueueName: (name: string) => name,
}));

vi.mock('../services/queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
  localFallbackEmitter: {
    on: vi.fn(),
  },
}));

vi.mock('../utils/pdf', () => ({
  generateTicketPDF: vi.fn(),
}));

vi.mock('../utils/email', () => ({
  sendEmail: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Booking Worker (processBookingConfirm)', () => {
  let ticketsStore: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    ticketsStore = [];
    vi.mocked(Ticket.findOneAndUpdate).mockImplementation(async (query: any, update: any, _options: any) => {
      const ticketId = query.ticketId;
      const existing = ticketsStore.find((t) => t.ticketId === ticketId);
      if (existing) {
        return existing;
      }
      const newTicket = {
        ticketId,
        ...update.$setOnInsert,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      ticketsStore.push(newTicket);
      return newTicket;
    });

    vi.mocked(Ticket.findById).mockImplementation(async (id: any) => {
      return ticketsStore.find((t) => String(t._id) === String(id)) || null;
    });
  });

  it('should generate tickets and enqueue PDF generation when no tickets exist (Full Generation)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      eventId: mockEventId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestEmail: 'guest@example.com',
      guestName: 'Jane Guest',
      tickets: [
        {
          tier: 'gold',
          tierName: 'Gold Package',
          quantity: 2,
        },
      ],
    };

    const mockEvent = {
      _id: mockEventId,
      bookingMode: 'general_admission',
      ticketTiers: [{ tier: 'gold', groupSize: 1 }],
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    await processBookingConfirm(mockBookingId);

    expect(ticketsStore.length).toBe(2);
    expect(ticketsStore[0].ticketId).toBe('TKT-MAD-2026-X7Y8Z-001');
    expect(ticketsStore[1].ticketId).toBe('TKT-MAD-2026-X7Y8Z-002');
    expect(Ticket.findOneAndUpdate).toHaveBeenCalledTimes(2);

    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'pdf-queue',
      'pdf:generate',
      {
        bookingId: mockBookingId,
        eventId: mockEventId,
        recipientEmail: 'guest@example.com',
        guestName: 'Jane Guest',
      },
      `pdf:generate:${mockBookingId}`
    );
  });

  it('should recover and generate only missing tickets if partially generated previously (Partial Recovery)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      eventId: mockEventId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestEmail: 'guest@example.com',
      guestName: 'Jane Guest',
      tickets: [
        {
          tier: 'gold',
          tierName: 'Gold Package',
          quantity: 3,
        },
      ],
    };

    const mockEvent = {
      _id: mockEventId,
      bookingMode: 'general_admission',
      ticketTiers: [{ tier: 'gold', groupSize: 1 }],
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const existingTicket = {
      ticketId: 'TKT-MAD-2026-X7Y8Z-001',
      bookingId: mockBookingId,
      eventId: mockEventId,
      tierName: 'Gold Package',
      tier: 'gold',
      admits: 1,
      qrCode: 'TKT-MAD-2026-X7Y8Z-001',
      createdAt: new Date(2026, 1, 1),
    };
    ticketsStore.push(existingTicket);

    await processBookingConfirm(mockBookingId);

    expect(ticketsStore.length).toBe(3);
    expect(ticketsStore.find((t) => t.ticketId === 'TKT-MAD-2026-X7Y8Z-001')).toBe(existingTicket);
    expect(ticketsStore.find((t) => t.ticketId === 'TKT-MAD-2026-X7Y8Z-002')).toBeDefined();
    expect(ticketsStore.find((t) => t.ticketId === 'TKT-MAD-2026-X7Y8Z-003')).toBeDefined();
    expect(Ticket.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  it('should preserve existing scannedAt status of previously generated tickets (Scan State Preservation)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      eventId: mockEventId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestEmail: 'guest@example.com',
      guestName: 'Jane Guest',
      tickets: [
        {
          tier: 'gold',
          tierName: 'Gold Package',
          quantity: 2,
        },
      ],
    };

    const mockEvent = {
      _id: mockEventId,
      bookingMode: 'general_admission',
      ticketTiers: [{ tier: 'gold', groupSize: 1 }],
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const scanTime = new Date();
    const preScannedTicket = {
      ticketId: 'TKT-MAD-2026-X7Y8Z-001',
      bookingId: mockBookingId,
      eventId: mockEventId,
      tierName: 'Gold Package',
      tier: 'gold',
      admits: 1,
      qrCode: 'TKT-MAD-2026-X7Y8Z-001',
      scannedAt: scanTime,
    };
    ticketsStore.push(preScannedTicket);

    await processBookingConfirm(mockBookingId);

    const recoveredTicket = ticketsStore.find((t) => t.ticketId === 'TKT-MAD-2026-X7Y8Z-001');
    expect(recoveredTicket?.scannedAt).toBe(scanTime);
    expect(ticketsStore.length).toBe(2);
  });

  it('should be safe on consecutive worker retry attempts (Retry Safety)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      eventId: mockEventId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestEmail: 'guest@example.com',
      guestName: 'Jane Guest',
      tickets: [
        {
          tier: 'gold',
          tierName: 'Gold Package',
          quantity: 3,
        },
      ],
    };

    const mockEvent = {
      _id: mockEventId,
      bookingMode: 'general_admission',
      ticketTiers: [{ tier: 'gold', groupSize: 1 }],
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    await processBookingConfirm(mockBookingId);
    expect(ticketsStore.length).toBe(3);

    await processBookingConfirm(mockBookingId);
    expect(ticketsStore.length).toBe(3);
  });

  it('should prevent duplicate ticket creation under concurrent executions (Concurrent Worker Test)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      eventId: mockEventId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestEmail: 'guest@example.com',
      guestName: 'Jane Guest',
      tickets: [
        {
          tier: 'gold',
          tierName: 'Gold Package',
          quantity: 4,
        },
      ],
    };

    const mockEvent = {
      _id: mockEventId,
      bookingMode: 'general_admission',
      ticketTiers: [{ tier: 'gold', groupSize: 1 }],
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    await Promise.all([
      processBookingConfirm(mockBookingId),
      processBookingConfirm(mockBookingId),
    ]);

    expect(ticketsStore.length).toBe(4);
    expect(ticketsStore.map((t) => t.ticketId).sort()).toEqual([
      'TKT-MAD-2026-X7Y8Z-001',
      'TKT-MAD-2026-X7Y8Z-002',
      'TKT-MAD-2026-X7Y8Z-003',
      'TKT-MAD-2026-X7Y8Z-004',
    ]);
  });
});

describe('PDF Worker (processPDFGenerate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render PDF and enqueue email dispatch with Base64 payload', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestName: 'Jane Guest',
      guestEmail: 'guest@example.com',
    };

    const mockEvent = {
      _id: mockEventId,
      title: 'Sunset Beach Concert',
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const fakePdfBuffer = Buffer.from('fake-pdf-content');
    vi.mocked(generateTicketPDF).mockResolvedValue(fakePdfBuffer);
    vi.mocked(Notification.findOne).mockResolvedValue(null);
    vi.mocked(Notification.create).mockResolvedValue({
      status: 'queued',
      isSent: false,
    } as any);

    await processPDFGenerate(mockBookingId, mockEventId, 'guest@example.com', 'Jane Guest');

    expect(generateTicketPDF).toHaveBeenCalledWith(mockBooking, mockEvent);
    expect(Notification.create).toHaveBeenCalled();
    expect(QueueService.enqueue).toHaveBeenCalledWith(
      'notification-queue',
      'email:dispatch',
      expect.objectContaining({
        to: 'guest@example.com',
        subject: expect.stringContaining('Sunset Beach Concert'),
        attachments: [
          {
            filename: `MAD_Ticket_MAD-2026-X7Y8Z.pdf`,
            content: fakePdfBuffer.toString('base64'),
            contentType: 'application/pdf',
          },
        ],
      }),
      `email-dispatch-${mockBookingId}`
    );
  });

  it('should skip PDF generation if Notification status is sent (idempotency)', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestName: 'Jane Guest',
      guestEmail: 'guest@example.com',
    };

    const mockEvent = {
      _id: mockEventId,
      title: 'Sunset Beach Concert',
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    vi.mocked(Notification.findOne).mockResolvedValue({
      status: 'sent',
      isSent: true,
    } as any);
    vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
      status: 'sent',
      isSent: true,
    } as any);

    await processPDFGenerate(mockBookingId, mockEventId, 'guest@example.com', 'Jane Guest');

    expect(generateTicketPDF).not.toHaveBeenCalled();
    expect(QueueService.enqueue).not.toHaveBeenCalled();
  });

  it('should allow PDF generation on retry if Notification status is queued', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();

    const mockBooking = {
      _id: mockBookingId,
      bookingId: 'MAD-2026-X7Y8Z',
      guestName: 'Jane Guest',
      guestEmail: 'guest@example.com',
    };

    const mockEvent = {
      _id: mockEventId,
      title: 'Sunset Beach Concert',
    };

    vi.mocked(Booking.findById).mockResolvedValue(mockBooking as any);
    vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

    const fakePdfBuffer = Buffer.from('fake-pdf-content');
    vi.mocked(generateTicketPDF).mockResolvedValue(fakePdfBuffer);
    vi.mocked(Notification.findOne).mockResolvedValue({
      status: 'queued',
      isSent: false,
    } as any);
    vi.mocked(Notification.create).mockResolvedValue({
      status: 'queued',
      isSent: false,
    } as any);

    await processPDFGenerate(mockBookingId, mockEventId, 'guest@example.com', 'Jane Guest');

    expect(generateTicketPDF).toHaveBeenCalled();
    expect(QueueService.enqueue).toHaveBeenCalled();
  });
});
