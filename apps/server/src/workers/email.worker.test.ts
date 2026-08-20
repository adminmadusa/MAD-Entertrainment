import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MagicTokenModel } from '../models/magic-token.schema';
import { Notification } from '../models/notification.schema';
import { sendEmail } from '../utils/email';
import { processEmailDispatch, handleJobExecution } from './email.worker';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => ({
    FRONTEND_URL: 'https://example.com',
    ALLOWED_ORIGINS: 'https://example.com',
  })),
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

describe('Email Worker (processEmailDispatch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockReset();
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  it('should create and process new notification atomically', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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

    await handleJobExecution(jobId, data, 1);

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
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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
    const jobId = `email-dispatch-${mockBookingId}`;
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
      updatedAt: new Date(Date.now() - 2 * 60 * 1000),
    } as any);

    vi.mocked(Notification.findOneAndUpdate).mockResolvedValue(null);

    await handleJobExecution(jobId, data, 1);

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
          }),
        ]),
      }),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should allow worker retry execution if the 5-minute lease concurrency lock has expired', async () => {
    const mockBookingId = new Types.ObjectId().toString();
    const mockEventId = new Types.ObjectId().toString();
    const jobId = `email-dispatch-${mockBookingId}`;
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
      updatedAt: new Date(Date.now() - 6 * 60 * 1000),
    } as any);

    vi.mocked(Notification.findOneAndUpdate).mockResolvedValue({
      _id: 'mock-id',
      status: 'processing',
      isSent: false,
    } as any);

    await handleJobExecution(jobId, data, 1);

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
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockReset();
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  it('should skip email dispatch if enqueued job OTP token is stale', async () => {
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

    await handleJobExecution(jobId, data, 0);

    expect(sendEmail).not.toHaveBeenCalled();
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

    await expect(handleJobExecution(jobId, data, 0)).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
