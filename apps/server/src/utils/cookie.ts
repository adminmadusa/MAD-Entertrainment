import { Response } from 'express';

import { getEnv } from '../config/env';

export const setXsrfCookie = (res: Response, csrfToken: string): void => {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';

  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false, // Must be readable by Axios
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // Matches refreshToken SameSite logic
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days TTL (matches refresh token)
  });
};

export const clearXsrfCookie = (res: Response): void => {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';

  res.clearCookie('XSRF-TOKEN', {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
};
