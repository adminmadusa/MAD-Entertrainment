import { canPublish } from './guards';
import { isExpired, isScheduled, isVisibleNow } from './evaluation';

export function isDraft(isPublished: boolean): boolean {
  return !isPublished;
}

export function isPublishedState(isPublished: boolean): boolean {
  return isPublished;
}

export function canBeVisible(
  isPublished: boolean,
  start?: string | Date | null,
  end?: string | Date | null,
  now: Date = new Date()
): boolean {
  return canPublish(start, end) && (isVisibleNow(isPublished, start, end, now) || isScheduled(start, now) || isExpired(end, now));
}
