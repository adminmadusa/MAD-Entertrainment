import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  getEnv: vi.fn(() => ({
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test_jwt_secret_with_32_characters_long_minimum',
    JWT_ADMIN_SECRET: 'test_admin_secret_with_32_characters_long_minimum',
    JWT_SESSION_SECRET: 'test_session_secret_with_32_characters_long_minimum',
    PUBLIC_WEB_URL: 'https://www.madentertainments.net',
  })),
  getPublicWebUrl: vi.fn(() => 'https://www.madentertainments.net'),
}));

import {
  listEmailTemplates,
  previewEmailTemplate,
  AVAILABLE_TEMPLATES,
} from './email-preview.controller';

const mockRequest = (params = {}, body = {}, admin?: any) => {
  return {
    params,
    body,
    admin,
  } as any;
};

const mockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('Email Preview Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listEmailTemplates', () => {
    it('should return all available email templates', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await listEmailTemplates(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: AVAILABLE_TEMPLATES,
        })
      );
      expect(AVAILABLE_TEMPLATES.length).toBe(8);
    });
  });

  describe('previewEmailTemplate', () => {
    it('should render magic_link template successfully', async () => {
      const req = mockRequest({ templateId: 'magic_link' });
      const res = mockResponse();
      const next = vi.fn();

      await previewEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            templateId: 'magic_link',
            subject: 'Sign in to MAD Entertainment',
            html: expect.stringContaining('849 201'),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should render booking_confirmation template successfully', async () => {
      const req = mockRequest({ templateId: 'booking_confirmation' });
      const res = mockResponse();
      const next = vi.fn();

      await previewEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            templateId: 'booking_confirmation',
            subject: expect.stringContaining('MAD-2026-8899'),
            html: expect.stringContaining('Sarah Jenkins'),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should render ticket_invitation template successfully', async () => {
      const req = mockRequest({ templateId: 'ticket_invitation' });
      const res = mockResponse();
      const next = vi.fn();

      await previewEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            templateId: 'ticket_invitation',
            html: expect.stringContaining('Claim My Ticket'),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass AppError 404 to next() for unknown template', async () => {
      const req = mockRequest({ templateId: 'unknown_template' });
      const res = mockResponse();
      const next = vi.fn();

      await previewEmailTemplate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "Template 'unknown_template' not found",
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
