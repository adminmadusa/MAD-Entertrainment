import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { checkoutSchema, reserveTicketsSchema } from '@mad/validations';

function expectAccepted(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(true);
  return result;
}

function expectRejected(schema: z.ZodTypeAny, payload: unknown, expectedMessage?: string) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success && expectedMessage) {
    const messages = result.error.errors.map((e) => e.message);
    expect(messages).toContain(expectedMessage);
  }
  return result;
}

describe('booking schema validations', () => {
  const validEventId = '60c72b2f9b1d8e25b8d29b02';

  describe('reserveTicketsSchema', () => {
    it('accepts valid tickets with unique tiers', () => {
      const payload = {
        eventId: validEventId,
        tickets: [
          { tier: 'vip', quantity: 2 },
          { tier: 'ga', quantity: 1 }
        ]
      };
      expectAccepted(reserveTicketsSchema, payload);
    });

    it('rejects duplicate ticket tiers', () => {
      const payload = {
        eventId: validEventId,
        tickets: [
          { tier: 'vip', quantity: 2 },
          { tier: 'vip', quantity: 2 }
        ]
      };
      expectRejected(reserveTicketsSchema, payload, 'Duplicate ticket tiers are not allowed');
    });

    it('rejects empty tickets array', () => {
      const payload = {
        eventId: validEventId,
        tickets: []
      };
      expectRejected(reserveTicketsSchema, payload, 'Must select at least one ticket');
    });
  });

  describe('checkoutSchema', () => {
    const baseCheckoutPayload = {
      eventId: validEventId,
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+919876543210',
    };

    it('accepts valid checkout details with unique ticket tiers', () => {
      const payload = {
        ...baseCheckoutPayload,
        tickets: [
          { tier: 'vip', quantity: 2 },
          { tier: 'ga', quantity: 1 }
        ]
      };
      expectAccepted(checkoutSchema, payload);
    });

    it('rejects duplicate ticket tiers in checkout', () => {
      const payload = {
        ...baseCheckoutPayload,
        tickets: [
          { tier: 'vip', quantity: 2 },
          { tier: 'vip', quantity: 1 }
        ]
      };
      expectRejected(checkoutSchema, payload, 'Duplicate ticket tiers are not allowed');
    });
  });
});
