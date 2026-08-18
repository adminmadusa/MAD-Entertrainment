/**
 * Normalizes ticket references from QR code payloads, manual operator entries,
 * or mobile deep-links into canonical ticket identifiers.
 *
 * Handles:
 * - Trimming whitespace/newlines
 * - Full URLs: "https://www.madentertainments.net/tickets/TKT-001" -> "TKT-001"
 * - Relative URLs: "/tickets/TKT-001" -> "TKT-001"
 * - API QR URLs: "/api/public/tickets/TKT-001/qr" -> "TKT-001"
 * - URLs with query strings or hash fragments: ".../tickets/TKT-001?foo=bar#section" -> "TKT-001"
 * - Raw ticket IDs: "TKT-MAD-2026-X7Y8Z-001" -> "TKT-MAD-2026-X7Y8Z-001"
 */
export function normalizeTicketReference(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If it is an absolute URL
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsedUrl = new URL(trimmed);
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const ticketsIdx = segments.indexOf('tickets');
      if (ticketsIdx !== -1 && segments[ticketsIdx + 1]) {
        const ref = segments[ticketsIdx + 1];
        return ref !== 'qr' ? ref : segments[ticketsIdx - 1] || ref;
      }
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        if (last === 'qr' && segments.length > 1) {
          return segments[segments.length - 2];
        }
        if (last && last !== 'qr') {
          return last;
        }
      }
    }
  } catch {
    // If not a parseable URL, fall through to pattern extraction
  }

  // Relative path parsing
  if (trimmed.includes('/tickets/')) {
    const after = trimmed.split('/tickets/')[1];
    if (after) {
      const clean = after.split(/[?#/]/)[0];
      if (clean && clean !== 'qr') return clean;
    }
  }

  // Strip leading slashes if any
  return trimmed.replace(/^\/+/, '');
}
