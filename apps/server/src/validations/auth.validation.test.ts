import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  checkEmailSchema,
  googleAuthSchema,
  logoutAuthSchema,
  magicLinkSchema,
  refreshAuthSchema,
  verifyAuthSchema,
  updateProfileSchema,
} from './auth.validation';


function expectAccepted(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(true);
  return result;
}

function expectRejected(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
}

describe('public auth validation schemas', () => {
  it.each([
    ['google auth', googleAuthSchema, { idToken: 'google.jwt.token' }],
    ['check email', checkEmailSchema, { email: ' USER@Example.COM ' }],
    [
      'magic link',
      magicLinkSchema,
      {
        email: ' USER@Example.COM ',
        firstName: ' Ada ',
        lastName: ' Lovelace ',
        mobileNumber: ' +919999999999 ',
      },
    ],
    ['verify auth', verifyAuthSchema, { email: ' USER@Example.COM ', otp: ' 123456 ' }],
    ['refresh empty body', refreshAuthSchema, {}],
    ['refresh undefined body', refreshAuthSchema, undefined],
    ['refresh body token', refreshAuthSchema, { refreshToken: ' token-value ' }],
    ['logout empty body', logoutAuthSchema, {}],
    ['logout undefined body', logoutAuthSchema, undefined],
    ['logout body token', logoutAuthSchema, { refreshToken: ' token-value ' }],
  ])('accepts valid payload for %s', (_name, schema, payload) => {
    expectAccepted(schema, payload);
  });

  it.each([
    [checkEmailSchema, { email: ' USER@Example.COM ' }],
    [magicLinkSchema, { email: ' USER@Example.COM ' }],
    [verifyAuthSchema, { email: ' USER@Example.COM ', otp: '123456' }],
  ])('trims and lowercases email inputs', (schema, payload) => {
    const result = expectAccepted(schema, payload);

    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('trims OTP inputs', () => {
    const result = expectAccepted(verifyAuthSchema, { email: 'user@example.com', otp: ' 123456 ' });

    if (result.success) {
      expect(result.data.otp).toBe('123456');
    }
  });

  it.each([
    ['check email', checkEmailSchema, { email: 'not-an-email' }],
    ['magic link', magicLinkSchema, { email: 'not-an-email' }],
    ['verify auth', verifyAuthSchema, { email: 'not-an-email', otp: '123456' }],
    ['too long email', checkEmailSchema, { email: `${'a'.repeat(245)}@example.com` }],
  ])('rejects invalid emails for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it.each([
    ['missing OTP', { email: 'user@example.com' }],
    ['short OTP', { email: 'user@example.com', otp: '12345' }],
    ['long OTP', { email: 'user@example.com', otp: '1234567' }],
    ['non-numeric OTP', { email: 'user@example.com', otp: '12ab56' }],
    ['empty OTP', { email: 'user@example.com', otp: '' }],
  ])('rejects invalid OTP for %s', (_name, payload) => {
    expectRejected(verifyAuthSchema, payload);
  });

  it.each([
    ['missing idToken', {}],
    ['empty idToken', { idToken: '' }],
    ['non-string idToken', { idToken: 123 }],
    ['too long idToken', { idToken: 'a'.repeat(4097) }],
  ])('rejects Google auth payload for %s', (_name, payload) => {
    expectRejected(googleAuthSchema, payload);
  });

  it.each([
    ['google auth', googleAuthSchema, { idToken: 'google.jwt.token', extra: true }],
    ['check email', checkEmailSchema, { email: 'user@example.com', extra: true }],
    ['magic link', magicLinkSchema, { email: 'user@example.com', password: 'unused' }],
    ['verify auth', verifyAuthSchema, { email: 'user@example.com', otp: '123456', token: 'unused' }],
    ['refresh', refreshAuthSchema, { refreshToken: 'token-value', extra: true }],
    ['logout', logoutAuthSchema, { refreshToken: 'token-value', extra: true }],
  ])('rejects extra fields for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it.each([
    ['refresh empty object', refreshAuthSchema, {}],
    ['refresh undefined', refreshAuthSchema, undefined],
    ['logout empty object', logoutAuthSchema, {}],
    ['logout undefined', logoutAuthSchema, undefined],
  ])('preserves optional token behavior for %s', (_name, schema, payload) => {
    const result = expectAccepted(schema, payload);

    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  describe('updateProfileSchema', () => {
    it('accepts valid profile update payload', () => {
      expectAccepted(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+919876543210',
      });
    });

    it('accepts empty mobileNumber or missing mobileNumber', () => {
      expectAccepted(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '',
      });
      expectAccepted(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('trims firstName and lastName and mobileNumber', () => {
      const result = expectAccepted(updateProfileSchema, {
        firstName: '  John  ',
        lastName: '  Doe  ',
        mobileNumber: '  +14155552671  ',
      });
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
        expect(result.data.mobileNumber).toBe('+14155552671');
      }
    });

    it('rejects invalid E.164 phone formats', () => {
      expectRejected(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '1234567890', // missing +
      });
      expectRejected(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+0123456789', // starts with +0 (invalid E.164 country code)
      });
      expectRejected(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+1234567890123456', // too long (> 15 digits)
      });
    });

    it('rejects empty or missing names', () => {
      expectRejected(updateProfileSchema, {
        firstName: '',
        lastName: 'Doe',
      });
      expectRejected(updateProfileSchema, {
        firstName: 'John',
        lastName: '   ',
      });
      expectRejected(updateProfileSchema, {
        lastName: 'Doe',
      });
    });

    it('rejects extra fields', () => {
      expectRejected(updateProfileSchema, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'other@gmail.com', // extra
      });
    });
  });
});
