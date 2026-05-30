import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

import { processBookingConfirm } from './booking.worker';
import { processPDFGenerate } from './pdf.worker';
import { processEmailDispatch } from './email.worker';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Ticket } from '../models/ticket.schema';
import { Notification } from '../models/notification.schema';
import { QueueService } from '../services/queue.service';
import { generateTicketPDF } from '../utils/pdf';
import { sendEmail } from '../utils/email';

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
  },
}));

vi.mock('../models/notification.schema', () => ({
  Notification: {
    create: vi.fn(),
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
    it('should skip ticket generation if tickets already exist (idempotence)', async () => {
      const mockBookingId = new Types.ObjectId().toString();
      vi.mocked(Booking.findById).mockResolvedValue({ _id: mockBookingId } as any);
      vi.mocked(Ticket.countDocuments).mockResolvedValue(2); // Tickets already exist

      await processBookingConfirm(mockBookingId);

      expect(Ticket.create).not.toHaveBeenCalled();
      expect(QueueService.enqueue).not.toHaveBeenCalled();
    });

    it('should generate tickets and enqueue PDF generation if tickets do not exist', async () => {
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
      vi.mocked(Ticket.countDocuments).mockResolvedValue(0);
      vi.mocked(Event.findById).mockResolvedValue(mockEvent as any);

      await processBookingConfirm(mockBookingId);

      // Should generate 2 ticket records for quantity 2
      expect(Ticket.create).toHaveBeenCalledTimes(2);
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

      await processPDFGenerate(mockBookingId, mockEventId, 'guest@example.com', 'Jane Guest');

      expect(generateTicketPDF).toHaveBeenCalledWith(mockBooking, mockEvent);
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
});
