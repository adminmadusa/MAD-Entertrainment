import { hasEnded, hasStarted, isActiveRange } from './ranges';

export type PublishState = 'draft' | 'scheduled' | 'active' | 'expired';

export function resolvePublishState(
  isPublished: boolean,
  start: string | Date | undefined | null,
  end: string | Date | undefined | null,
  now: Date = new Date()
): PublishState {
  if (!isPublished) return 'draft';
  if (end && hasEnded(end, now)) return 'expired';
  if (start && !hasStarted(start, now)) return 'scheduled';
  return isActiveRange(start, end, now) ? 'active' : 'draft';
}

export function canPublish(start: string | Date | undefined | null, end: string | Date | undefined | null): boolean {
  if (!start && !end) return true;
  if (!start || !end) return true;
  return new Date(end).getTime() >= new Date(start).getTime();
}

export function shouldAutoExpire(end: string | Date | undefined | null, now: Date = new Date()): boolean {
  return !!end && hasEnded(end, now);
}
