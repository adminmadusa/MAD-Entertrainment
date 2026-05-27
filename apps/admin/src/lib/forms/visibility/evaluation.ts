import { hasEnded, hasStarted, isActiveRange } from "../scheduling";

export function isVisibleNow(
  isPublished: boolean,
  start?: string | Date | null,
  end?: string | Date | null,
  now: Date = new Date(),
): boolean {
  if (!isPublished) return false;
  return isActiveRange(start || undefined, end || undefined, now);
}

export function isExpired(
  end?: string | Date | null,
  now: Date = new Date(),
): boolean {
  return !!end && hasEnded(end, now);
}

export function isScheduled(
  start?: string | Date | null,
  now: Date = new Date(),
): boolean {
  return !!start && !hasStarted(start, now);
}
