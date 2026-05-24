// Safety guard – prevent accidental localhost usage in production builds
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
  throw new Error('Production build cannot use localhost API URL');
}

// Centralized frontend configuration for API and Socket URLs
// This file is imported by both admin and web apps.
// It pulls values from NEXT_PUBLIC environment variables which are
// injected at build time by Vercel or locally via .env files.
// No fallback values are provided – the build will fail if the vars are missing.

export const API_URL = process.env.NEXT_PUBLIC_API_URL!;
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;
