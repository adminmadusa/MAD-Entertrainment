import { describe, expect, it } from 'vitest';

import {
  resolvePublishState,
  toIsoDateTime,
  toLocalDateTimeInput,
  validateDateRange,
  validateExpiry,
} from './index';

describe('forms/scheduling', () => {
  it('converts ISO to local datetime input format', () => {
    expect(toLocalDateTimeInput('2026-01-01T10:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('converts local datetime input to ISO', () => {
    expect(toIsoDateTime('2026-01-01T10:30')).toContain('2026-01-01T');
  });

  it('validates date ranges', () => {
    expect(validateDateRange('2026-01-01T10:00', '2026-01-01T12:00')).toBe(true);
    expect(validateDateRange('2026-01-01T12:00', '2026-01-01T10:00')).toBe(false);
  });

  it('resolves publish state', () => {
    const now = new Date('2026-01-01T10:00:00.000Z');
    expect(resolvePublishState(false, undefined, undefined, now)).toBe('draft');
    expect(resolvePublishState(true, '2026-01-01T11:00:00.000Z', '2026-01-02T11:00:00.000Z', now)).toBe('scheduled');
    expect(resolvePublishState(true, '2026-01-01T09:00:00.000Z', '2026-01-02T11:00:00.000Z', now)).toBe('active');
    expect(resolvePublishState(true, '2025-12-31T09:00:00.000Z', '2025-12-31T10:00:00.000Z', now)).toBe('expired');
  });

  it('validates expiry against now', () => {
    const now = new Date('2026-01-01T10:00:00.000Z');
    expect(validateExpiry('2026-01-01T11:00:00.000Z', now)).toBe(true);
    expect(validateExpiry('2026-01-01T09:00:00.000Z', now)).toBe(false);
  });
});
