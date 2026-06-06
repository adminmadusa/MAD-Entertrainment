/**
 * Deterministic, timezone-invariant date formatter.
 *
 * WHY UTC METHODS?
 * ─────────────────────────────────────────────────────────────────────────────
 * `toLocaleDateString()` is locale- and timezone-dependent. On the Node server
 * it runs in UTC (or whatever TZ is set), but on a client browser it runs in
 * the user's local timezone. For an event stored as "2026-05-23T00:00:00.000Z"
 * (UTC midnight) a user in UTC+5:30 would see May 22 after the timezone shift,
 * causing a hydration mismatch between server and client HTML.
 *
 * Using getUTC* methods forces both environments to read the same UTC values,
 * guaranteeing that the rendered string is identical on server and client.
 *
 * WHY NO dateStr.replace(/-/g, "/")?
 * ─────────────────────────────────────────────────────────────────────────────
 * The "-" → "/" replacement was a Safari workaround for an old iOS quirk where
 * `new Date("2026-05-23")` returned Invalid Date. Modern Safari (iOS 15+) no
 * longer has this issue, and the replacement breaks ISO-8601 strings that
 * contain a "T" separator (e.g. "2026-05-23T18:00:00.000Z" becomes
 * "2026/05/23 18:00:00.000Z" which fails to parse on Safari). The root cause
 * of the Date TBA fallback was this failed parse.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Formats an event date string or Date object as a short, human-readable string.
 *
 * Returns "Date TBA" when the value is absent or unparseable.
 *
 * Output example: "Sat, May 23, 2026"
 *
 * @param dateStr - ISO-8601 string, legacy date string, or a Date object.
 */
export function formatEventDate(dateStr: Date | string | null | undefined): string {
  if (!dateStr) return 'Date TBA';

  try {
    // new Date() correctly parses ISO-8601 strings (with or without time parts)
    // in all modern environments including Safari iOS 15+.
    const d = new Date(dateStr as string);

    if (isNaN(d.getTime())) {
      return 'Date TBA';
    }

    // Use UTC getters so that the rendered string is identical on server (Node/UTC)
    // and client (browser/local-timezone), eliminating the hydration mismatch.
    const weekday = WEEKDAYS[d.getUTCDay()];
    const month = MONTHS[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();

    return `${weekday}, ${month} ${day}, ${year}`;
  } catch {
    return 'Date TBA';
  }
}
