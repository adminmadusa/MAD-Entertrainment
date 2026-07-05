import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getEnv } from '../config/env';
import { auditLog } from './audit';
import { sendViaZeptoMail } from './zeptomail';

// Mock variables
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    ZEPTOMAIL_API_TOKEN: 'Zoho-enczapikey test_token_123',
    ZEPTOMAIL_API_URL: 'https://api.zeptomail.in/v1.1/email',
    MAIL_FROM: 'noreply@mad.esparex.in',
    EMAIL_REPLY_TO: 'replyto@mad.esparex.in',
  } as Record<string, any>,
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('./audit', () => ({
  auditLog: vi.fn(),
}));

vi.mock('../config/env', () => ({
  getEnv: vi.fn(() => mockEnv),
}));

describe('ZeptoMail Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.ZEPTOMAIL_API_TOKEN = 'Zoho-enczapikey test_token_123';
    mockEnv.ZEPTOMAIL_API_URL = 'https://api.zeptomail.in/v1.1/email';
    mockEnv.MAIL_FROM = 'noreply@mad.esparex.in';
    mockEnv.EMAIL_REPLY_TO = 'replyto@mad.esparex.in';
  });

  it('should throw an error if ZEPTOMAIL_API_TOKEN is not configured', async () => {
    mockEnv.ZEPTOMAIL_API_TOKEN = undefined;

    await expect(
      sendViaZeptoMail({
        to: 'buyer@example.com',
        subject: 'My Tickets',
        html: '<p>Body</p>',
      })
    ).rejects.toThrow('ZEPTOMAIL_CONFIGURATION_INVALID: ZEPTOMAIL_API_TOKEN is missing.');

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should format requests correctly and call axios.post on success', async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: { message: 'Success' } });

    await expect(
      sendViaZeptoMail({
        to: 'buyer@example.com',
        subject: 'My Tickets',
        html: '<p>Body</p>',
        messageId: '<custom-id>',
      })
    ).resolves.toBeUndefined();

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.zeptomail.in/v1.1/email',
      expect.objectContaining({
        from: {
          address: 'noreply@mad.esparex.in',
          name: 'MAD Entertrainment',
        },
        to: [
          {
            email_address: {
              address: 'buyer@example.com',
              name: 'buyer',
            },
          },
        ],
        subject: 'My Tickets',
        htmlbody: '<p>Body</p>',
        reply_to: [
          {
            address: 'replyto@mad.esparex.in',
            name: 'Support Team',
          },
        ],
        mime_headers: {
          'Message-ID': '<custom-id>',
        },
      }),
      expect.objectContaining({
        headers: {
          Authorization: 'Zoho-enczapikey test_token_123',
          'Content-Type': 'application/json',
        },
      })
    );

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ZEPTOMAIL_DELIVERY_SUCCESS',
        status: 'success',
      })
    );
  });

  it('should support parse sender formatted name from MAIL_FROM', async () => {
    mockEnv.MAIL_FROM = 'MAD USA <noreply@mad.usa>';
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: {} });

    await sendViaZeptoMail({
      to: 'buyer@example.com',
      subject: 'My Tickets',
      html: '<p>Body</p>',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        from: {
          address: 'noreply@mad.usa',
          name: 'MAD USA',
        },
      }),
      expect.any(Object)
    );
  });

  it('should auto-prefix Authorization header if raw token is provided', async () => {
    mockEnv.ZEPTOMAIL_API_TOKEN = 'raw_api_token_value';
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: {} });

    await sendViaZeptoMail({
      to: 'buyer@example.com',
      subject: 'My Tickets',
      html: '<p>Body</p>',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Zoho-enczapikey raw_api_token_value',
        }),
      })
    );
  });

  it('should encode attachments in base64 format', async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 200, data: {} });

    await sendViaZeptoMail({
      to: 'buyer@example.com',
      subject: 'My Tickets',
      html: '<p>Body</p>',
      attachments: [
        {
          filename: 'receipt.pdf',
          content: Buffer.from('hello pdf content'),
          contentType: 'application/pdf',
        },
      ],
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        attachments: [
          {
            content: Buffer.from('hello pdf content').toString('base64'),
            mime_type: 'application/pdf',
            name: 'receipt.pdf',
          },
        ],
      }),
      expect.any(Object)
    );
  });

  it('should log failure, audit failure, and throw error if axios.post fails', async () => {
    const apiError = new Error('Request failed');
    (apiError as any).response = {
      status: 400,
      data: { error: 'Bad request payload' },
    };
    vi.mocked(axios.post).mockRejectedValue(apiError);

    await expect(
      sendViaZeptoMail({
        to: 'buyer@example.com',
        subject: 'My Tickets',
        html: '<p>Body</p>',
      })
    ).rejects.toThrow('Request failed');

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ZEPTOMAIL_DELIVERY_FAILURE',
        status: 'failure',
        metadata: expect.objectContaining({
          statusCode: 400,
          errorBody: JSON.stringify({ error: 'Bad request payload' }),
        }),
      })
    );
  });
});
