import { JwtPayload } from '@mad/types';

/**
 * Decodes a JWT token payload safely in any environment (Browser, SSR, Node, Edge).
 * Correctly decodes multi-byte UTF-8 character sequences.
 * Returns null if the token is missing, invalid, or malformed.
 */
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    // Cross-platform safe atob extraction
    const rawBinary = typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');

    // UTF-8-safe decoding sequence
    const jsonPayload = decodeURIComponent(
      rawBinary
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired, missing, or malformed.
 * Returns true if the token is missing, invalid, or the exp timestamp is in the past.
 * Returns false if the token has a valid future expiration (or lacks an exp claim).
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded) return true;

  if (typeof decoded.exp !== 'number') {
    return false; // Treat tokens without exp claim as non-expiring
  }

  return decoded.exp * 1000 < Date.now();
}
