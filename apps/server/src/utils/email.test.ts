import * as Sentry from '@sentry/node';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { auditLog } from './audit';

// Hoist variables to avoid ReferenceError
const { mockEnv, mockVerify, mockSendMail } = vi.hoisted(() => ({
  mockEnv: {
    SMTP_HOST: '',
    SMTP_PORT: undefined,
    SMTP_USER: '',
    SMTP_PASS: '',
    MAIL_FROM: '',
    SMTP_SECURE: false,
    EMAIL_REPLY_TO: '',
  } as Record<string, any>,
  mockVerify: vi.fn(),
  mockSendMail: vi.fn(),
}));

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn(() => ({
        verify: mockVerify,
        sendMail: mockSendMail,
      })),
    },
  };
});

vi.mock('@sentry/node', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('./audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => mockEnv),
}));

// Import the functions under test AFTER mocks are configured
import {
  validateSmtpConfig,
  verifyTransporter,
  sendEmail,
  resetTransporter
} from './email';

describe('Email Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTransporter();
    // Reset mockEnv values to clean default
    mockEnv.SMTP_HOST = '';
    mockEnv.SMTP_PORT = undefined;
    mockEnv.SMTP_USER = '';
    mockEnv.SMTP_PASS = '';
    mockEnv.MAIL_FROM = '';
    mockEnv.SMTP_SECURE = false;
    mockEnv.EMAIL_REPLY_TO = '';

    mockVerify.mockReset();
    mockSendMail.mockReset();
  });

  describe('validateSmtpConfig', () => {
    it('should do nothing if SMTP_HOST is not set', () => {
      mockEnv.SMTP_HOST = '';
      expect(() => validateSmtpConfig()).not.toThrow();
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('should throw and write audit log if SMTP_HOST is set but config is incomplete', () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      mockEnv.SMTP_USER = ''; // Missing USER, PASS, MAIL_FROM

      expect(() => validateSmtpConfig()).toThrow(/SMTP_CONFIGURATION_INVALID/);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SMTP_CONFIGURATION_INVALID'),
        expect.objectContaining({ level: 'fatal' })
      );
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SMTP_CONFIGURATION_INVALID',
          status: 'failure',
          metadata: expect.objectContaining({
            missingFields: expect.arrayContaining(['SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']),
          }),
        })
      );
    });

    it('should pass and not throw if SMTP_HOST and all required fields are set', () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      mockEnv.SMTP_USER = 'user';
      mockEnv.SMTP_PASS = 'pass';
      mockEnv.MAIL_FROM = 'noreply@example.com';

      expect(() => validateSmtpConfig()).not.toThrow();
      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe('verifyTransporter', () => {
    it('should return false if transporter cannot be initialized (missing host/port)', async () => {
      mockEnv.SMTP_HOST = '';
      mockEnv.SMTP_PORT = undefined;

      const isVerified = await verifyTransporter();
      expect(isVerified).toBe(false);
      expect(auditLog).not.toHaveBeenCalled();
    });

    it('should return true and audit log success when verification passes', async () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      mockVerify.mockResolvedValue(true);

      const isVerified = await verifyTransporter();
      expect(isVerified).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SMTP_TRANSPORT_VERIFIED',
          status: 'success',
        })
      );
    });

    it('should return false, notify Sentry, and audit log failure when verification fails', async () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      const verifyError = new Error('Auth failed');
      mockVerify.mockRejectedValue(verifyError);

      const isVerified = await verifyTransporter();
      expect(isVerified).toBe(false);
      expect(Sentry.captureException).toHaveBeenCalledWith(verifyError, expect.any(Object));
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SMTP_TRANSPORT_UNAVAILABLE',
          status: 'failure',
          metadata: { error: 'Auth failed' },
        })
      );
    });
  });

  describe('sendEmail', () => {
    it('should throw, notify Sentry, and audit log SMTP_TRANSPORT_UNAVAILABLE if transporter is not configured', async () => {
      mockEnv.SMTP_HOST = '';
      mockEnv.SMTP_PORT = undefined;

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>test</p>',
        })
      ).rejects.toThrow('SMTP transporter unavailable');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('SMTP_TRANSPORT_UNAVAILABLE'),
        expect.any(Object)
      );
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SMTP_TRANSPORT_UNAVAILABLE',
          status: 'failure',
          metadata: { to: 'test@example.com', subject: 'Test Subject' },
        })
      );
    });

    it('should send mail successfully when transporter is configured and sendMail succeeds', async () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>test</p>',
        })
      ).resolves.toBeUndefined();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>test</p>',
        })
      );
      expect(auditLog).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SMTP_DELIVERY_FAILURE' })
      );
    });

    it('should throw and write audit log SMTP_DELIVERY_FAILURE if sendMail fails', async () => {
      mockEnv.SMTP_HOST = 'smtp.example.com';
      mockEnv.SMTP_PORT = 587;
      const sendError = new Error('SMTP Timeout');
      mockSendMail.mockRejectedValue(sendError);

      await expect(
        sendEmail({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>test</p>',
        })
      ).rejects.toThrow('SMTP Timeout');

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SMTP_DELIVERY_FAILURE',
          status: 'failure',
          metadata: {
            to: 'test@example.com',
            subject: 'Test Subject',
            error: 'SMTP Timeout',
          },
        })
      );
    });
  });
});
