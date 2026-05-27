import { validatePublishWindow } from "../scheduling";

export function canPublish(
  start?: string | Date | null,
  end?: string | Date | null,
): boolean {
  return validatePublishWindow(start || undefined, end || undefined);
}

export function canSchedule(start?: string | Date | null): boolean {
  return !!start;
}

export function canExpire(end?: string | Date | null): boolean {
  return !!end;
}
