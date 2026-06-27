import { EventCategory } from '@mad/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { listEventsQuerySchema } from './payment.validation';
import { listDJOperatorsQuerySchema } from './dj-operator.validation';

function expectAccepted(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(true);
  return result;
}

function expectRejected(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
}

describe('public query validation schemas', () => {
  it.each([
    ['events', listEventsQuerySchema, { page: '2', limit: '24', search: 'festival', category: EventCategory.CONCERT }],
    ['DJ operators', listDJOperatorsQuerySchema, { page: '2', limit: '24', search: 'house' }],
  ])('accepts valid pagination for %s', (_name, schema, payload) => {
    const result = expectAccepted(schema, payload);

    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(24);
    }
  });

  it.each([
    ['events negative page', listEventsQuerySchema, { page: '-1', limit: '12' }],
    ['events NaN page', listEventsQuerySchema, { page: 'abc', limit: '12' }],
    ['DJ negative limit', listDJOperatorsQuerySchema, { page: '1', limit: '-12' }],
    ['DJ NaN limit', listDJOperatorsQuerySchema, { page: '1', limit: 'abc' }],
  ])('rejects invalid pagination for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it.each([
    ['events', listEventsQuerySchema, { limit: '101' }],
    ['DJ operators', listDJOperatorsQuerySchema, { limit: '101' }],
  ])('rejects excessive limit for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it('rejects invalid event category', () => {
    expectRejected(listEventsQuerySchema, { category: 'bogus' });
  });

  it.each([
    ['events', listEventsQuerySchema],
    ['DJ operators', listDJOperatorsQuerySchema],
  ])('bounds search for %s', (_name, schema) => {
    expectRejected(schema, { search: 'a'.repeat(201) });
  });

  it.each([
    ['string false', { includeTotal: 'false' }, 'false'],
    ['boolean false', { includeTotal: false }, 'false'],
    ['string true', { includeTotal: 'true' }, 'true'],
    ['boolean true', { includeTotal: true }, 'true'],
  ])('coerces includeTotal while preserving controller-compatible string output for %s', (_name, payload, expected) => {
    const result = expectAccepted(listDJOperatorsQuerySchema, payload);

    if (result.success) {
      expect(result.data.includeTotal).toBe(expected);
    }
  });
});
