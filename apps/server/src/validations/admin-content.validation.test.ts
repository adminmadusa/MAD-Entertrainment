import { BookingStatus, EventCategory, PopupTrigger } from '@mad/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  adminBookingsQuerySchema,
  adminIdParamSchema,
  createCategorySchema,
  createCouponSchema,
  createPopupSchema,
  createRefundSchema,
  createTierSchema,
  processRefundSchema,
  scannerScanSchema,
  updateCategorySchema,
  updateCouponSchema,
  updatePopupSchema,
  updateTierSchema,
} from './admin-content.validation';

const objectId = '507f1f77bcf86cd799439011';
const otherObjectId = '507f1f77bcf86cd799439012';

function expectAccepted(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(true);
}

function expectRejected(schema: z.ZodTypeAny, payload: unknown) {
  const result = schema.safeParse(payload);
  expect(result.success).toBe(false);
}

describe('admin mutation validation schemas', () => {
  it.each([
    [
      'create coupon',
      createCouponSchema,
      {
        body: {
          code: 'earlybird',
          discountType: 'percentage',
          discountValue: 25,
          maxDiscount: 500,
          minOrderAmount: 1000,
          validFrom: '2026-06-01T00:00:00.000Z',
          validUntil: '2026-07-01T00:00:00.000Z',
          usageLimit: 100,
          isActive: true,
          applicableEventIds: [objectId],
          applicableCategories: [EventCategory.CONCERT],
        },
      },
    ],
    ['update coupon', updateCouponSchema, { params: { id: objectId }, body: { isActive: false } }],
    [
      'create popup',
      createPopupSchema,
      {
        body: {
          name: 'Festival banner',
          title: 'Book now',
          description: 'Limited offer',
          image: { url: 'https://example.com/banner.jpg', publicId: 'popups/banner' },
          ctaUrl: 'https://example.com/events/festival',
          ctaText: 'View event',
          trigger: PopupTrigger.AFTER_DELAY,
          triggerDelay: 3000,
          cooldownHours: 24,
          priority: 1,
          showOnPages: ['/', '/events'],
          isActive: true,
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-07-01T00:00:00.000Z',
          linkedEventId: objectId,
        },
      },
    ],
    ['update popup', updatePopupSchema, { params: { id: objectId }, body: { title: 'Updated title' } }],
    ['create refund', createRefundSchema, { body: { bookingId: objectId, paymentId: otherObjectId, amount: 500, reason: 'Customer request' } }],
    ['process refund', processRefundSchema, { params: { id: objectId }, body: { action: 'approve', adminNotes: '', gatewayRefundId: '' } }],
    ['scanner scan', scannerScanSchema, { body: { ticketId: 'TKT-001', eventId: objectId } }],
    ['create category', createCategorySchema, { body: { name: 'Concerts' } }],
    ['update category', updateCategorySchema, { params: { id: objectId }, body: { name: 'Comedy' } }],
    ['create tier', createTierSchema, { body: { name: 'VIP' } }],
    ['update tier', updateTierSchema, { params: { id: objectId }, body: { name: 'Gold' } }],
  ])('accepts valid payload for %s', (_name, schema, payload) => {
    expectAccepted(schema, payload);
  });

  it.each([
    ['create coupon', createCouponSchema, { body: { discountType: 'fixed' } }],
    ['update coupon', updateCouponSchema, { params: { id: objectId }, body: { unexpected: true } }],
    ['create popup', createPopupSchema, { body: { name: 'Popup', title: '' } }],
    ['update popup', updatePopupSchema, { params: { id: objectId }, body: { triggerDelay: -1 } }],
    ['create refund', createRefundSchema, { body: { bookingId: objectId, paymentId: otherObjectId, amount: 0 } }],
    ['process refund', processRefundSchema, { params: { id: objectId }, body: { adminNotes: 'Missing action' } }],
    ['scanner scan', scannerScanSchema, { body: { ticketId: '', eventId: objectId } }],
    ['create category', createCategorySchema, { body: { name: '' } }],
    ['update category', updateCategorySchema, { params: { id: objectId }, body: {} }],
    ['create tier', createTierSchema, { body: { name: 'VIP', color: 'gold' } }],
    ['update tier', updateTierSchema, { params: { id: objectId }, body: { name: '' } }],
  ])('rejects invalid payload for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it.each([
    ['shared admin id param', adminIdParamSchema, { params: { id: 'not-an-object-id' } }],
    ['update coupon param', updateCouponSchema, { params: { id: 'not-an-object-id' }, body: { code: 'SAVE' } }],
    ['update popup param', updatePopupSchema, { params: { id: 'not-an-object-id' }, body: { title: 'Updated' } }],
    ['process refund param', processRefundSchema, { params: { id: 'not-an-object-id' }, body: { action: 'approve' } }],
    ['update category param', updateCategorySchema, { params: { id: 'not-an-object-id' }, body: { name: 'Concerts' } }],
    ['update tier param', updateTierSchema, { params: { id: 'not-an-object-id' }, body: { name: 'VIP' } }],
    ['refund booking id', createRefundSchema, { body: { bookingId: 'bad', paymentId: otherObjectId, amount: 100 } }],
    ['scanner event id', scannerScanSchema, { body: { ticketId: 'TKT-001', eventId: 'bad' } }],
  ])('rejects invalid ObjectId for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });

  it.each([
    [
      'coupon discount type',
      createCouponSchema,
      {
        body: {
          code: 'SAVE',
          discountType: 'bogus',
          discountValue: 25,
          validFrom: '2026-06-01T00:00:00.000Z',
          validUntil: '2026-07-01T00:00:00.000Z',
          usageLimit: 100,
        },
      },
    ],
    [
      'coupon category',
      createCouponSchema,
      {
        body: {
          code: 'SAVE',
          discountType: 'fixed',
          discountValue: 250,
          validFrom: '2026-06-01T00:00:00.000Z',
          validUntil: '2026-07-01T00:00:00.000Z',
          usageLimit: 100,
          applicableCategories: ['bogus'],
        },
      },
    ],
    ['popup trigger', createPopupSchema, { body: { name: 'Popup', title: 'Title', trigger: 'hover' } }],
    ['refund process action', processRefundSchema, { params: { id: objectId }, body: { action: 'delete' } }],
  ])('enforces enum validation for %s', (_name, schema, payload) => {
    expectRejected(schema, payload);
  });
});

describe('admin bookings query validation schema', () => {
  it('accepts valid pagination and filters', () => {
    const result = adminBookingsQuerySchema.safeParse({
      page: '2',
      limit: '25',
      search: 'MAD-2026',
      status: BookingStatus.CONFIRMED,
      eventId: objectId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
      expect(result.data.status).toBe(BookingStatus.CONFIRMED);
      expect(result.data.eventId).toBe(objectId);
    }
  });

  it.each([
    ['negative page', { page: '-1' }],
    ['NaN page', { page: 'abc' }],
    ['negative limit', { limit: '-15' }],
    ['NaN limit', { limit: 'abc' }],
  ])('rejects invalid pagination for %s', (_name, payload) => {
    expectRejected(adminBookingsQuerySchema, payload);
  });

  it('rejects excessive limit', () => {
    expectRejected(adminBookingsQuerySchema, { limit: '101' });
  });

  it('rejects invalid ObjectId eventId', () => {
    expectRejected(adminBookingsQuerySchema, { eventId: 'not-an-object-id' });
  });

  it('rejects invalid booking status', () => {
    expectRejected(adminBookingsQuerySchema, { status: 'bogus' });
  });

  it('bounds search', () => {
    expectRejected(adminBookingsQuerySchema, { search: 'a'.repeat(201) });
  });
});
