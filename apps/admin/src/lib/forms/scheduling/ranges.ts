import { parseDateTime } from './datetime';

export function hasStarted(start: string | Date | undefined | null, now: Date = new Date()): boolean {
  const startDate = parseDateTime(start);
  if (!startDate) return false;
  return now.getTime() >= startDate.getTime();
}

export function hasEnded(end: string | Date | undefined | null, now: Date = new Date()): boolean {
  const endDate = parseDateTime(end);
  if (!endDate) return false;
  return now.getTime() > endDate.getTime();
}

export function isActiveRange(
  start: string | Date | undefined | null,
  end: string | Date | undefined | null,
  now: Date = new Date()
): boolean {
  const started = start ? hasStarted(start, now) : true;
  const ended = end ? hasEnded(end, now) : false;
  return started && !ended;
}

export function isExpiredRange(end: string | Date | undefined | null, now: Date = new Date()): boolean {
  return hasEnded(end, now);
}
