import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Booking } from '../models/booking.schema';
import { Event } from '../models/event.schema';
import { Notification } from '../models/notification.schema';
import { QueueService } from '../services/queue.service';
import { generateTicketPDF } from '../utils/pdf';
import { processPDFGenerate } from './pdf.worker';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    FRONTEND_URL: 'https://example.com',
    ALLOWED_ORIGINS: 'https://example.com',
  })),
  getPublicWebUrl: vi.fn(() => 'https://example.com'),
}));

vi.mock('../config/queue.config', () => ({
  getQueueConnection: () => ({}),
  getQueueName: (name: string) => name,
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

vi.mock('../models/notification.schema', () => ({
  Notification: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../models/payment.schema', () => ({
  Payment: {
    findOne: vi.fn(() => ({
      sort: vi.fn(() => ({
        lean: vi.fn().mockResolvedValue({
          gateway: 'stripe',
          gatewayPaymentId: 'pi_test_123',
          paidAt: new Date('2026-08-12T12:00:00Z'),
        }),
      })),
    })),
  },
}));

vi.mock('../services/queue.service', () => ({
  QueueService: {
    enqueue: vi.fn(),
  },
}));

vi.mock('../utils/pdf', () => ({
  generateTicketPDF: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

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
