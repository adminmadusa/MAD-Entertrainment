import { describe, expect, it } from 'vitest';

import { Coupon } from '@mad/types';

import {
  getDefaultCouponFormValues,
  mapCouponFormToPayload,
  mapCouponToFormValues,
  toLocalDatetimeString,
} from './coupon-form.mapper';

describe('coupon-form.mapper', () => {
  it('maps coupon entity to form values', () => {
    const coupon: Coupon = {
      _id: 'cpn_1',
      code: 'FLASH25',
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 700,
      minOrderAmount: 1200,
      usageLimit: 70,
      validFrom: '2026-12-01T12:00:00.000Z',
      validUntil: '2026-12-10T12:00:00.000Z',
      isActive: true,
      applicableEventIds: ['evt_1'],
      applicableCategories: ['concert'],
    };

    const values = mapCouponToFormValues(coupon);
    expect(values.code).toBe('FLASH25');
    expect(values.discountType).toBe('percentage');
    expect(values.discountValue).toBe(25);
    expect(values.applicableEventIds).toEqual(['evt_1']);
  });

  it('maps form values to API payload with normalization', () => {
    const values = getDefaultCouponFormValues();
    values.code = ' summer50 ';
    values.discountType = 'fixed';
    values.discountValue = 300;
    values.maxDiscount = '';
    values.minOrderAmount = '';
    values.usageLimit = 15;
    values.validFrom = '2026-10-01T10:00';
    values.validUntil = '2026-10-02T10:00';

    const payload = mapCouponFormToPayload(values);
    expect(payload.code).toBe('SUMMER50');
    expect(payload.discountType).toBe('fixed');
    expect(payload.maxDiscount).toBeNull();
    expect(payload.minOrderAmount).toBe(0);
    expect(payload.usageLimit).toBe(15);
  });

  it('returns local datetime input format', () => {
    const local = toLocalDatetimeString('2026-01-01T10:30:00.000Z');
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
