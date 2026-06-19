import { getEnv } from '../config/env';

// Strict regex matching only our project subdomains on our team scope
const VERCEL_PREVIEW_REGEX =
  /^https:\/\/mad-entertrainment(?:-[a-zA-Z0-9-]+)?-madentertrainments\.vercel\.app$/;

const BASE_PREVIEW_DOMAINS = [
  'https://mad-entertrainment-web.vercel.app',
  'https://mad-entertrainment-admin.vercel.app',
];

/**
 * Validates whether an incoming request Origin is allowed.
 * Centralized for reuse in Express CORS and Socket.io.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow non-browser requests (e.g. curl)

  const env = getEnv();
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.includes(origin)) return true;

  if (VERCEL_PREVIEW_REGEX.test(origin)) return true;

  if (BASE_PREVIEW_DOMAINS.includes(origin)) return true;

  return false;
}
