import { describe, it, expect } from 'vitest';

import { formatDate, formatDateTime, formatEventDate } from './date';

describe('Date Utilities - GOV-001F1 Extraction', () => {

  describe('formatDate', () => {
    // TC-001: Valid date with defaults (UTC)
    it('should format a valid date with default options (UTC, en-US)', () => {
      const date = new Date('2026-06-24T12:00:00Z');
      const result = formatDate(date);
      // Resilient assertions independent of slash/hyphen separators or spacing
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('24');
    });

    // TC-002: Timezone override (New York)
    it('should support timezone override to America/New_York (shifting date back)', () => {
      // 3:00 AM UTC on June 24 is 11:00 PM EDT on June 23 in New York
      const date = new Date('2026-06-24T03:00:00Z');
      const result = formatDate(date, { timeZone: 'America/New_York' });
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('23');
    });

    // TC-003: Timezone override (Chicago)
    it('should support timezone override to America/Chicago (shifting date back)', () => {
      // 1:00 AM UTC on June 25 is 8:00 PM CDT on June 24 in Chicago
      const date = new Date('2026-06-25T01:00:00Z');
      const result = formatDate(date, { timeZone: 'America/Chicago' });
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('24');
    });

    // TC-004: Locale override (en-IN)
    it('should support locale override to en-IN', () => {
      const date = new Date('2026-06-24T12:00:00Z');
      const result = formatDate(date, { locale: 'en-IN' });
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('24');
    });

    // TC-005: Options merging (custom date styles)
    it('should merge formatting options correctly', () => {
      const date = new Date('2026-06-24T12:00:00Z');
      const result = formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
      expect(result).toContain('2026');
      expect(result).toContain('Jun');
      expect(result).toContain('24');
    });

    // TC-006: Null/undefined date
    it('should return Date TBA when date is null or undefined', () => {
      expect(formatDate(null)).toBe('Date TBA');
      expect(formatDate(undefined)).toBe('Date TBA');
    });

    // TC-007: Malformed date string
    it('should return Date TBA when date is an invalid or unparseable string', () => {
      expect(formatDate('invalid-date-string')).toBe('Date TBA');
      expect(formatDate(NaN)).toBe('Date TBA');
    });
  });

  describe('formatDateTime', () => {
    // TC-008: Date-time formatting (UTC)
    it('should format a date-time with default options (UTC)', () => {
      const date = new Date('2026-06-24T12:00:00Z');
      const result = formatDateTime(date);
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('24');
      // Hour component in 12-hour or 24-hour format
      expect(result).toMatch(/(12|12:00)/);
    });

    // TC-009: Date-time timezone override (Los Angeles)
    it('should format a date-time with timezone override (America/Los_Angeles)', () => {
      // 12:00 PM UTC is 5:00 AM PDT in Los Angeles
      const date = new Date('2026-06-24T12:00:00Z');
      const result = formatDateTime(date, { timeZone: 'America/Los_Angeles' });
      expect(result).toContain('2026');
      expect(result).toContain('6');
      expect(result).toContain('24');
      expect(result).toContain('5');
    });
  });

  describe('formatEventDate', () => {
    // TC-010: Legacy event date format
    it('should format event dates using manual, timezone-invariant UTC getters', () => {
      const dateStr = '2026-05-23T00:00:00.000Z';
      expect(formatEventDate(dateStr)).toBe('Sat, May 23, 2026');

      const dateObj = new Date('2026-05-23T18:30:00.000Z');
      expect(formatEventDate(dateObj)).toBe('Sat, May 23, 2026');
    });

    // TC-011: Legacy event date null
    it('should return Date TBA when event date is null or undefined', () => {
      expect(formatEventDate(null)).toBe('Date TBA');
      expect(formatEventDate(undefined)).toBe('Date TBA');
    });

    // TC-012: Legacy event date invalid
    it('should return Date TBA when event date is unparseable', () => {
      expect(formatEventDate('not-a-valid-date')).toBe('Date TBA');
    });
  });
});
