import {
  resolvePublishState as resolveSchedulingPublishState,
  PublishState,
} from "../scheduling";

export type VisibilityState = PublishState;

export function resolveVisibilityState(
  isPublished: boolean,
  start?: string | Date | null,
  end?: string | Date | null,
  now: Date = new Date(),
): VisibilityState {
  return resolveSchedulingPublishState(
    isPublished,
    start || undefined,
    end || undefined,
    now,
  );
}

export function resolvePublishState(
  isPublished: boolean,
  start?: string | Date | null,
  end?: string | Date | null,
  now: Date = new Date(),
): PublishState {
  return resolveVisibilityState(isPublished, start, end, now);
}
