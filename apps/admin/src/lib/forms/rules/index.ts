export function isValidDateRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return new Date(end).getTime() >= new Date(start).getTime();
}

export function isPositiveNumber(value: number | ''): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isPercentageInRange(value: number | ''): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100;
}
