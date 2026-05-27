import { resolveVisibilityState, VisibilityState } from './states';

export function nextVisibilityTransition(
  isPublished: boolean,
  start?: string | Date | null,
  end?: string | Date | null,
  now: Date = new Date()
): VisibilityState {
  return resolveVisibilityState(isPublished, start, end, now);
}
