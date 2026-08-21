/**
 * Currency & Money Utilities — Integer Minor-Unit Arithmetic
 *
 * Prevents IEEE-754 floating-point inaccuracies (e.g., 0.1 + 0.2 !== 0.3)
 * across refund calculations, remaining balance determinations, and gateway integrations.
 */

/**
 * Converts a major currency amount (e.g. dollars / rupees) to integer minor currency units (cents / paise).
 * Uses Math.round to protect against floating point representation glitches.
 */
export function toMinorUnits(amountMajor: number): number {
  if (typeof amountMajor !== 'number' || isNaN(amountMajor)) {
    return 0;
  }
  return Math.round(amountMajor * 100);
}

/**
 * Converts minor currency units (cents / paise) back to a major currency unit number.
 */
export function fromMinorUnits(amountMinor: number): number {
  if (typeof amountMinor !== 'number' || isNaN(amountMinor)) {
    return 0;
  }
  return amountMinor / 100;
}

/**
 * Checks if two currency amounts in major units are equal down to the minor unit (cent/paise).
 */
export function isEqualAmount(amountA: number, amountB: number): boolean {
  return toMinorUnits(amountA) === toMinorUnits(amountB);
}

/**
 * Determines whether the cumulative sum of previous refunds plus the current refund
 * fully settles (or exceeds) the original payment amount, using integer minor units.
 */
export function isFullRefund(
  totalRefundedSoFar: number,
  currentRefund: number,
  totalPayment: number
): boolean {
  const totalRefundedMinor = toMinorUnits(totalRefundedSoFar) + toMinorUnits(currentRefund);
  const paymentMinor = toMinorUnits(totalPayment);
  return totalRefundedMinor >= paymentMinor;
}

/**
 * Calculates the remaining refundable balance on a payment in major units,
 * guaranteeing no negative or fractional precision errors.
 */
export function calculateRemainingBalance(
  totalPayment: number,
  totalRefunded: number
): number {
  const remainingMinor = Math.max(0, toMinorUnits(totalPayment) - toMinorUnits(totalRefunded));
  return fromMinorUnits(remainingMinor);
}

/**
 * Sums an array of numbers in major currency units using integer minor units.
 */
export function sumCurrencyAmounts(amounts: number[]): number {
  const totalMinor = amounts.reduce((sum, amt) => sum + toMinorUnits(amt), 0);
  return fromMinorUnits(totalMinor);
}
