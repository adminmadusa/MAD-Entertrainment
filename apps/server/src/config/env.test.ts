import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, getPublicWebUrl, _resetEnvForTesting } from './env';

describe('getPublicWebUrl', () => {
  const originalEnv = process.env;

  const baseEnv = {
    NODE_ENV: 'test',
    PORT: '3001',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_ADMIN_SECRET: '12345678901234567890123456789012',
    JWT_SESSION_SECRET: '12345678901234567890123456789012',
  };

  beforeEach(() => {
    _resetEnvForTesting();
    process.env = { ...originalEnv, ...baseEnv };
  });

  afterEach(() => {
    _resetEnvForTesting();
    process.env = originalEnv;
  });

  it('should return PUBLIC_WEB_URL if explicitly configured', () => {
    process.env.PUBLIC_WEB_URL = 'https://custom.madentertainments.net';
    process.env.ALLOWED_ORIGINS = 'https://madmin.esparex.in,https://mad.esparex.in';
    validateEnv();

    expect(getPublicWebUrl()).toBe('https://custom.madentertainments.net');
  });

  it('should return FRONTEND_URL if set and does not contain admin', () => {
    delete process.env.PUBLIC_WEB_URL;
    process.env.FRONTEND_URL = 'https://www.madentertainments.net/';
    process.env.ALLOWED_ORIGINS = 'https://madmin.esparex.in,https://mad.esparex.in';
    validateEnv();

    expect(getPublicWebUrl()).toBe('https://www.madentertainments.net');
  });

  it('should filter out admin/madmin domains from ALLOWED_ORIGINS when admin is listed first', () => {
    delete process.env.PUBLIC_WEB_URL;
    delete process.env.FRONTEND_URL;
    process.env.ALLOWED_ORIGINS = 'https://madmin.esparex.in, https://mad.esparex.in, https://admin.madentertainments.net';
    validateEnv();

    expect(getPublicWebUrl()).toBe('https://mad.esparex.in');
  });

  it('should fallback to production default if all origins are admin in production', () => {
    delete process.env.PUBLIC_WEB_URL;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://madmin.esparex.in, https://admin.madentertainments.net';
    process.env.DLQ_ENCRYPTION_KEY = 'a_production_secret_key_32_chars!';
    validateEnv();

    expect(getPublicWebUrl()).toBe('https://www.madentertainments.net');
  });

  it('should fallback to localhost in development', () => {
    delete process.env.PUBLIC_WEB_URL;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'development';
    process.env.ALLOWED_ORIGINS = 'https://madmin.esparex.in';
    validateEnv();

    expect(getPublicWebUrl()).toBe('http://localhost:3000');
  });
});
