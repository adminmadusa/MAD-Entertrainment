import { EventCategory } from '@mad/shared';
import { describe, expect, it } from 'vitest';

import {
  matchesCategory,
  matchesEventId,
  matchesPage,
  normalizeId,
  normalizePagesInput,
  normalizeStringArray,
  toCouponTargetingPayload,
  toPopupTargetingPayload,
  validateTargetingRules,
} from './index';

describe('forms/targeting', () => {
  it('normalizes ids/pages/arrays', () => {
    expect(normalizeId(' abc ')).toBe('abc');
    expect(normalizePagesInput('/, /events,')).toEqual(['/', '/events']);
    expect(normalizeStringArray([' a ', '', 'b'])).toEqual(['a', 'b']);
  });

  it('transforms payloads', () => {
    expect(toCouponTargetingPayload([' evt1 ', ''], [EventCategory.CONCERT]).applicableEventIds).toEqual(['evt1']);
    expect(toPopupTargetingPayload('/, /events', ' 123 ').linkedEventId).toBe('123');
  });

  it('validates and matches targeting', () => {
    expect(validateTargetingRules({ eventIds: ['e1'], pages: ['/'] })).toBe(true);
    expect(matchesEventId(['e1'], 'e1')).toBe(true);
    expect(matchesCategory([EventCategory.CONCERT], EventCategory.CONCERT)).toBe(true);
    expect(matchesPage(['/events'], '/events')).toBe(true);
  });
});
