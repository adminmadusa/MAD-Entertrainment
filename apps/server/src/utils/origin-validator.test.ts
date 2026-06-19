import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOriginAllowed } from './origin-validator';
import * as envConfig from '../config/env';

vi.mock('../config/env', () => ({
  getEnv: vi.fn(),
}));

describe('isOriginAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows empty or undefined origins (non-browser requests)', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it('allows explicitly configured origins', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(isOriginAllowed('https://mad.esparex.in')).toBe(true);
    expect(isOriginAllowed('https://madmin.esparex.in')).toBe(true);
  });

  it('blocks unknown third-party domains', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(isOriginAllowed('https://google.com')).toBe(false);
    expect(isOriginAllowed('https://attacker.com')).toBe(false);
  });

  it('allows Vercel base preview domains', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(isOriginAllowed('https://mad-entertrainment-web.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://mad-entertrainment-admin.vercel.app')).toBe(true);
  });

  it('allows Vercel unique deployment previews within our team scope', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(
      isOriginAllowed('https://mad-entertrainment-7xn2q8d56-madentertrainments.vercel.app')
    ).toBe(true);
    expect(
      isOriginAllowed('https://mad-entertrainment-admin-5wkv0i2im-madentertrainments.vercel.app')
    ).toBe(true);
  });

  it('allows Vercel git branch preview aliases within our team scope', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(
      isOriginAllowed('https://mad-entertrainment-web-git-main-madentertrainments.vercel.app')
    ).toBe(true);
    expect(
      isOriginAllowed('https://mad-entertrainment-admin-git-main-madentertrainments.vercel.app')
    ).toBe(true);
  });

  it('blocks malicious spoofed origins', () => {
    vi.spyOn(envConfig, 'getEnv').mockReturnValue({
      ALLOWED_ORIGINS: 'https://mad.esparex.in,https://madmin.esparex.in',
    } as any);

    expect(
      isOriginAllowed('https://mad-entertrainment-madentertrainments.vercel.app.attacker.com')
    ).toBe(false);
    expect(
      isOriginAllowed('https://evil-mad-entertrainment-madentertrainments.vercel.app')
    ).toBe(false);
    expect(isOriginAllowed('https://mad-entertrainment-7xn2q8d56-otherteam.vercel.app')).toBe(
      false
    );
  });
});
