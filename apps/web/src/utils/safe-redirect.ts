/**
 * Validates a returnTo URL path to ensure it is a safe, internal relative route.
 * Rejects absolute URLs, protocol-relative URLs, backslash paths, and script URI schemes.
 */
export function validateReturnTo(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const cleanUrl = decodeURIComponent(url).trim();

    // Must start with '/' to be an internal relative path
    // Reject protocol-relative paths starting with '//' or backslash paths starting with '\\'
    if (!cleanUrl.startsWith('/') || cleanUrl.startsWith('//') || cleanUrl.startsWith('\\\\')) {
      return null;
    }

    // Sanitize control characters and whitespaces to prevent evasion (e.g. "java\nsCRIPT:")
    const sanitizedUrl = cleanUrl.replace(/[\s\0\x00-\x1F]/g, '');

    // Reject malicious script URI protocols (javascript:, data:, vbscript:)
    if (/^(javascript|data|vbscript):/i.test(sanitizedUrl)) {
      return null;
    }

    return cleanUrl;
  } catch (e) {
    // If URL decoding fails, treat as unsafe
    return null;
  }
}
