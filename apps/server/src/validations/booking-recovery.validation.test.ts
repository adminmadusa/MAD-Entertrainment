import { describe, expect, it } from 'vitest';
import { recoverBookingSchema, verifyRecoveredBookingOTPSchema } from './booking-recovery.validation';

describe('Booking Recovery Validation Schema', () => {
  it('should accept a valid transaction ID', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: 'pay_123456789' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionId).toBe('pay_123456789');
    }
  });

  it('should trim transaction ID', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: '  pay_123456789  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transactionId).toBe('pay_123456789');
    }
  });

  it('should reject transaction ID that is too short', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: 'pay' });
    expect(result.success).toBe(false);
  });

  it('should reject transaction ID that is too long', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: 'a'.repeat(255) });
    expect(result.success).toBe(false);
  });

  it('should reject missing transaction ID', () => {
    const result = recoverBookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string transaction ID', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: 123456 });
    expect(result.success).toBe(false);
  });

  it('should reject extra fields', () => {
    const result = recoverBookingSchema.safeParse({ transactionId: 'pay_123456789', extra: 'field' });
    expect(result.success).toBe(false);
  });
});

describe('Verify Recovered Booking OTP Validation Schema', () => {
  it('should accept valid transactionId and 6-digit numeric OTP', () => {
    const result = verifyRecoveredBookingOTPSchema.safeParse({
      transactionId: 'pay_123456789',
      otp: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-numeric OTP', () => {
    const result = verifyRecoveredBookingOTPSchema.safeParse({
      transactionId: 'pay_123456789',
      otp: '123a56',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short OTP', () => {
    const result = verifyRecoveredBookingOTPSchema.safeParse({
      transactionId: 'pay_123456789',
      otp: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should reject long OTP', () => {
    const result = verifyRecoveredBookingOTPSchema.safeParse({
      transactionId: 'pay_123456789',
      otp: '1234567',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = verifyRecoveredBookingOTPSchema.safeParse({
      transactionId: 'pay_123456789',
    });
    expect(result.success).toBe(false);
  });
});

