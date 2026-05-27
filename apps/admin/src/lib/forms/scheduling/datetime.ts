export function parseDateTime(
  value: string | Date | undefined | null,
): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalDateTimeInput(
  value: string | Date | undefined | null,
): string {
  const date = parseDateTime(value);
  if (!date) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function toIsoDateTime(
  value: string | Date | undefined | null,
): string | undefined {
  const date = parseDateTime(value);
  return date ? date.toISOString() : undefined;
}
