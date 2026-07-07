// Safety guard – prevent accidental localhost usage in production builds
const isRealProduction = Boolean(process.env.VERCEL) && process.env.VERCEL_ENV === 'production';

if (
  isRealProduction &&
  (process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ||
    process.env.NEXT_PUBLIC_API_URL?.includes('127.0.0.1') ||
    process.env.NEXT_PUBLIC_API_URL?.includes('0.0.0.0'))
) {
  throw new Error('Production build cannot use localhost API URL');
}

// Centralized frontend configuration for API and Socket URLs
// This file is imported by both admin and web apps.
// It pulls values from NEXT_PUBLIC environment variables which are
// injected at build time by Vercel or locally via .env files.
// No fallback values are provided – the build will fail if the vars are missing.

export const API_URL = typeof window !== 'undefined' ? '/api' : process.env.NEXT_PUBLIC_API_URL!;
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;
