import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { processBookingConfirm } from './booking.worker';
import { processPDFGenerate } from './pdf.worker';
import { processEmailDispatch, handleJobExecution } from './email.worker';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Ticket } from '../models/ticket.schema';
import { Notification } from '../models/notification.schema';
import { MagicTokenModel } from '../models/magic-token.schema';
import { QueueService } from '../services/queue.service';
import { generateTicketPDF } from '../utils/pdf';
import { sendEmail } from '../utils/email';

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

vi.mock('../models/magic-token.schema', () => ({
  MagicTokenModel: {
    findOne: vi.fn(),
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

describe('Asynchronous Workers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Booking Worker (processBookingConfirm)', () => {
    let ticketsStore: any[] = [];

    beforeEach(() => {
      ticketsStore = [];
      vi.mocked(Ticket.findOneAndUpdate).mockImplementation(async (query: any, update: any, options: any) => {
        const ticketId = query.ticketId;
        const existing = ticketsStore.find(t => t.ticketId === ticketId);
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
        return ticketsStore.find(t => String(t._id) === String(id)) || null;
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

      // Verify that exactly 2 tickets were created in our in-memory store
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

      // Pre-populate our store with the first ticket (simulating crash after first write)
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

      // Total tickets should be 3 (1 pre-existing + 2 missing ones created)
      expect(ticketsStore.length).toBe(3);
      expect(ticketsStore.find(t => t.ticketId === 'TKT-MAD-2026-X7Y8Z-001')).toBe(existingTicket);
      expect(ticketsStore.find(t => t.ticketId === 'TKT-MAD-2026-X7Y8Z-002')).toBeDefined();
      expect(ticketsStore.find(t => t.ticketId === 'TKT-MAD-2026-X7Y8Z-003')).toBeDefined();
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

      // Verify the pre-scanned ticket's scan state is preserved exactly
      const recoveredTicket = ticketsStore.find(t => t.ticketId === 'TKT-MAD-2026-X7Y8Z-001');
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

      // Run it the first time
      await processBookingConfirm(mockBookingId);
      expect(ticketsStore.length).toBe(3);

      // Run it a second time (Simulate retry)
      await processBookingConfirm(mockBookingId);

      // Should remain exactly 3 tickets with no duplicates
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

      // Trigger simultaneous execution of processBookingConfirm from two workers
      await Promise.all([
        processBookingConfirm(mockBookingId),
        processBookingConfirm(mockBookingId),
      ]);

      // Assert that exactly 4 tickets were created and no duplication occurred
      expect(ticketsStore.length).toBe(4);
      expect(ticketsStore.map(t => t.ticketId).sort()).toEqual([
        'TKT-MAD-2026-X7Y8Z-001',
        'TKT-MAD-2026-X7Y8Z-002',
        'TKT-MAD-2026-X7Y8Z-003',
        'TKT-MAD-2026-X7Y8Z-004',
      ]);
    });
  });

  describe('PDF Worker (processPDFGenerate)', () => {
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
        `email:dispatch:${mockBookingId}`
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

  describe('Email Worker (processEmailDispatch)', () => {
    it('should decode base64 attachments and send SMTP email', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();

      const attachments = [
        {
          filename: 'ticket.pdf',
          content: Buffer.from('pdf-content').toString('base64'),
          contentType: 'application/pdf',
        },
      ];

      await processEmailDispatch(
        'recipient@example.com',
        'Your Booking Confirmed',
        '<h1>Success</h1>',
        attachments,
        mockBookingId,
        mockEventId
      );

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Your Booking Confirmed',
        html: '<h1>Success</h1>',
        attachments: [
          {
            filename: 'ticket.pdf',
            content: Buffer.from('pdf-content'),
            contentType: 'application/pdf',
          },
        ],
      });
    });
  });

  describe('Email Worker (handleJobExecution)', () => {
    beforeEach(() => {
      vi.mocked(sendEmail).mockReset();
      vi.mocked(sendEmail).mockResolvedValue(undefined);
    });

    it('should create and process new notification atomically', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue(null);
      vi.mocked(Notification.create).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 0);

      expect(Notification.findOne).toHaveBeenCalledWith({ jobId });
      expect(Notification.create).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'sent', isSent: true }),
        })
      );
    });

    it('should skip duplicate concurrent execution on first attempt if status is processing', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 0);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should skip execution if notification is already sent (idempotency)', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'sent',
        isSent: true,
      } as any);

      await handleJobExecution(jobId, data, 0);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should allow execution on retry even if status is processing (retry safety)', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 1); // retry count = 1

      expect(sendEmail).toHaveBeenCalled();
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'sent', isSent: true }),
        })
      );
    });

    it('should skip duplicate concurrent execution on retry (attemptsMade > 0) if another worker already started that retry', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
        retryCount: 1,
      } as any);
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue(null);

      await handleJobExecution(jobId, data, 1);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should transition to failed if email dispatch fails', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'queued',
        isSent: false,
      } as any);
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);
      vi.mocked(sendEmail).mockRejectedValue(new Error('SMTP timeout') as any);

      await expect(handleJobExecution(jobId, data, 0)).rejects.toThrow('SMTP timeout');

      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'failed', errorMessage: 'SMTP timeout' }),
        })
      );
    });

    it('should call sendEmail with deterministic Message-ID derived from jobId', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue(null);
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 0);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: `<${jobId}@mad-entertainment.com>`,
        })
      );
    });

    it('should enforce 5-minute lease concurrency lock and skip execution if another worker started within the lease', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
        retryCount: 0,
        updatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (within 5-min lease)
      } as any);

      // findOneAndUpdate returns null because the query condition (updatedAt < 5 mins ago) is not satisfied
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue(null);

      await handleJobExecution(jobId, data, 1); // retry count = 1

      expect(sendEmail).not.toHaveBeenCalled();
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'mock-id',
          $or: expect.arrayContaining([
            expect.objectContaining({ status: { $in: ['queued', 'failed'] } }),
            expect.objectContaining({
              status: 'processing',
              retryCount: { $lt: 1 },
              updatedAt: expect.any(Object),
            })
          ])
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should allow worker retry execution if the 5-minute lease concurrency lock has expired', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      const mockEventId = new Types.ObjectId().toString();
      const jobId = `email:dispatch:${mockBookingId}`;
      const data = {
        to: 'recipient@example.com',
        subject: 'Booking Confirmed',
        html: '<h1>Success</h1>',
        bookingId: mockBookingId,
        eventId: mockEventId,
      };

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
        retryCount: 0,
        updatedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago (expired lease)
      } as any);

      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
        _id: 'mock-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 1); // retry count = 1

      expect(sendEmail).toHaveBeenCalled();
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'sent', isSent: true }),
        })
      );
    });
  });

  describe('Email Worker (handleJobExecution) - Stale OTP Job Verification', () => {
    beforeEach(() => {
      vi.mocked(sendEmail).mockReset();
      vi.mocked(sendEmail).mockResolvedValue(undefined);
    });

    it('should skip email dispatch if enqueued job OTP token is stale', async () => {
      const activeTokenId = new Types.ObjectId().toString();
      const jobTokenId = new Types.ObjectId().toString(); // different ID
      const jobId = `magic-user@example.com-${jobTokenId}`;
      const data = {
        to: 'user@example.com',
        subject: 'Sign In',
        html: '<h1>Sign In</h1>',
        notificationType: 'otp',
      };

      // Mock MongoDB to return MagicToken B (activeTokenId)
      vi.mocked(MagicTokenModel.findOne).mockResolvedValue({
        _id: new Types.ObjectId(activeTokenId),
        email: 'user@example.com',
      } as any);

      await handleJobExecution(jobId, data, 0);

      // Verify SMTP send was skipped
      expect(sendEmail).not.toHaveBeenCalled();
      
      // Verify Notification log is updated to sent/complete to avoid dangling states
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'sent', isSent: true }),
        })
      );
    });

    it('should dispatch email if enqueued job OTP token is active', async () => {
      const activeTokenId = new Types.ObjectId().toString();
      const jobId = `magic-user@example.com-${activeTokenId}`;
      const data = {
        to: 'user@example.com',
        subject: 'Sign In',
        html: '<h1>Sign In</h1>',
        notificationType: 'otp',
      };

      // Mock MongoDB to return MagicToken B (matching job ID)
      vi.mocked(MagicTokenModel.findOne).mockResolvedValue({
        _id: new Types.ObjectId(activeTokenId),
        email: 'user@example.com',
      } as any);

      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: 'notification-id',
        status: 'queued',
        isSent: false,
      } as any);
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
        _id: 'notification-id',
        status: 'processing',
        isSent: false,
      } as any);

      await handleJobExecution(jobId, data, 0);

      // Verify SMTP send was executed
      expect(sendEmail).toHaveBeenCalled();
      expect(Notification.updateOne).toHaveBeenCalledWith(
        { jobId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'sent', isSent: true }),
        })
      );
    });

    it('should complete job and not retry if the job is stale (retry safety)', async () => {
      const activeTokenId = new Types.ObjectId().toString();
      const jobTokenId = new Types.ObjectId().toString();
      const jobId = `magic-user@example.com-${jobTokenId}`;
      const data = {
        to: 'user@example.com',
        subject: 'Sign In',
        html: '<h1>Sign In</h1>',
        notificationType: 'otp',
      };

      vi.mocked(MagicTokenModel.findOne).mockResolvedValue({
        _id: new Types.ObjectId(activeTokenId),
        email: 'user@example.com',
      } as any);

      // We execute worker, it must resolve cleanly (no thrown error) so BullMQ marks it completed
      await expect(handleJobExecution(jobId, data, 0)).resolves.toBeUndefined();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});
