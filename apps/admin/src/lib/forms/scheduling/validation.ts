import { parseDateTime } from "./datetime";
import { hasEnded } from "./ranges";

export function validateDateRange(
  start: string | Date | undefined | null,
  end: string | Date | undefined | null,
): boolean {
  const startDate = parseDateTime(start);
  const endDate = parseDateTime(end);
  if (!startDate || !endDate) return false;
  return endDate.getTime() >= startDate.getTime();
}

export function validatePublishWindow(
  start: string | Date | undefined | null,
  end: string | Date | undefined | null,
): boolean {
  if (!start || !end) return true;
  return validateDateRange(start, end);
}

export function validateExpiry(
  end: string | Date | undefined | null,
  now: Date = new Date(),
): boolean {
  if (!end) return true;
  return !hasEnded(end, now);
}
