export function isPositiveNumber(value: number | ''): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isPercentageInRange(value: number | ''): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100;
}
