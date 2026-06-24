export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

// Pure, region-agnostic, hydration-safe defaults
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Deterministic date formatter wrapping toLocaleDateString.
 * Prevents hydration mismatches by using identical timezone and locale parameters
 * on both server and client. Defaults to UTC for timezone-invariance,
 * and supports full caller overrides.
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (!date) return 'Date TBA';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date TBA';

    const { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIMEZONE, ...rest } = options;

    return d.toLocaleDateString(locale, {
      timeZone,
      ...rest
    });
  } catch {
    return 'Date TBA';
  }
}

/**
 * Deterministic date-time formatter wrapping toLocaleString.
 * Prevents hydration mismatches by using identical timezone and locale parameters
 * on both server and client. Defaults to UTC for timezone-invariance,
 * and supports full caller overrides.
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (!date) return 'Date TBA';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date TBA';

    const { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIMEZONE, ...rest } = options;

    return d.toLocaleString(locale, {
      timeZone,
      ...rest
    });
  } catch {
    return 'Date TBA';
  }
}

/**
 * Legacy Event Date Formatter (matches original apps/web/src/utils/date.ts).
 * Formats event dates using timezone-invariant UTC getters to preserve
 * the exact visual layout (e.g., "Sat, May 23, 2026") on the public site.
 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function formatEventDate(dateStr: Date | string | null | undefined): string {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr as string);
    if (isNaN(d.getTime())) return 'Date TBA';

    const weekday = WEEKDAYS[d.getUTCDay()];
    const month = MONTHS[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();

    return `${weekday}, ${month} ${day}, ${year}`;
  } catch {
    return 'Date TBA';
  }
}
