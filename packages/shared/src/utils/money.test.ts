import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  isEqualAmount,
  isFullRefund,
  calculateRemainingBalance,
  sumCurrencyAmounts,
} from './money';

describe('Currency & Money Utilities in @mad/shared', () => {
  describe('toMinorUnits and fromMinorUnits', () => {
    it('converts major currency units to minor integer units accurately', () => {
      expect(toMinorUnits(100.1)).toBe(10010);
      expect(toMinorUnits(200.2)).toBe(20020);
      expect(toMinorUnits(300.3)).toBe(30030);
      expect(toMinorUnits(0.1 + 0.2)).toBe(30); // Eliminates 0.30000000000000004
      expect(toMinorUnits(0)).toBe(0);
      expect(toMinorUnits(NaN)).toBe(0);
    });

    it('converts minor integer units back to major currency units accurately', () => {
      expect(fromMinorUnits(10010)).toBe(100.1);
      expect(fromMinorUnits(20020)).toBe(200.2);
      expect(fromMinorUnits(30030)).toBe(300.3);
      expect(fromMinorUnits(0)).toBe(0);
      expect(fromMinorUnits(NaN)).toBe(0);
    });
  });

  describe('isEqualAmount', () => {
    it('accurately equates float sums that suffer from IEEE-754 precision issues', () => {
      expect(0.1 + 0.2 === 0.3).toBe(false); // standard JS float mismatch
      expect(isEqualAmount(0.1 + 0.2, 0.3)).toBe(true); // integer minor comparison matches
      expect(isEqualAmount(100.1 + 200.2, 300.3)).toBe(true);
      expect(isEqualAmount(50.0, 50.01)).toBe(false);
    });
  });

  describe('isFullRefund', () => {
    it('correctly classifies cumulative full refund with decimal values', () => {
      // Scenario: Payment is 300.30. Refund 1 is 100.10. Refund 2 is 200.20.
      expect(isFullRefund(100.1, 200.2, 300.3)).toBe(true);
      expect(isFullRefund(0, 500, 500)).toBe(true);
      expect(isFullRefund(250, 250, 500)).toBe(true);
      expect(isFullRefund(100, 50, 500)).toBe(false);
      expect(isFullRefund(400, 99.99, 500)).toBe(false);
      expect(isFullRefund(400, 100.01, 500)).toBe(true); // >= total payment
    });
  });

  describe('calculateRemainingBalance', () => {
    it('calculates remaining balance without float precision artifacts', () => {
      expect(calculateRemainingBalance(300.3, 100.1)).toBe(200.2);
      expect(calculateRemainingBalance(500, 500)).toBe(0);
      expect(calculateRemainingBalance(500, 600)).toBe(0); // caps at 0
      expect(calculateRemainingBalance(100, 33.33)).toBe(66.67);
    });
  });

  describe('sumCurrencyAmounts', () => {
    it('accurately sums arrays of currency values', () => {
      expect(sumCurrencyAmounts([100.1, 200.2])).toBe(300.3);
      expect(sumCurrencyAmounts([0.1, 0.2])).toBe(0.3);
      expect(sumCurrencyAmounts([10, 20, 30])).toBe(60);
    });
  });
});
