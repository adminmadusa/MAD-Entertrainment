import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BookingStatus, EventCategory, PopupTrigger } from '@mad/shared';

import { adminBookingIdentifierParamSchema, adminBookingsQuerySchema, adminIdParamSchema, cancelBookingSchema, createCategorySchema, createCouponSchema, createPopupSchema, createRefundSchema, createTierSchema, processRefundSchema, scannerScanSchema, scannerStatsSchema, scannerHistorySchema, updateDJOperatorSchema, updateCategorySchema, updateCouponSchema, updatePopupSchema, updateTicketProfileSchema, updateTierSchema } from './admin-content.validation';
import { createEventSchema, updateEventSchema } from './event.validation';

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
    ['create ticket-level refund', createRefundSchema, { body: { bookingId: objectId, paymentId: otherObjectId, amount: 200, cancelTickets: true, ticketIds: [objectId] } }],
    ['cancel booking basic', cancelBookingSchema, { params: { id: objectId }, body: { reason: 'Customer requested' } }],
    ['cancel booking with refund and tickets', cancelBookingSchema, { params: { id: objectId }, body: { reason: 'Customer requested', refundAmount: 250, ticketIds: [objectId] } }],
    ['process refund', processRefundSchema, { params: { id: objectId }, body: { action: 'approve', adminNotes: '', gatewayRefundId: '' } }],
    ['scanner scan', scannerScanSchema, { body: { ticketId: 'TKT-001', eventId: objectId } }],
    ['create category', createCategorySchema, { body: { name: 'Concerts' } }],
    ['update category', updateCategorySchema, { params: { id: objectId }, body: { name: 'Comedy' } }],
    ['create tier', createTierSchema, { body: { name: 'VIP' } }],
    ['update tier', updateTierSchema, { params: { id: objectId }, body: { name: 'Gold' } }],
    ['update event', updateEventSchema, { params: { id: objectId }, body: { title: 'Updated event', eventVersion: 1 } }],
    ['update DJ operator', updateDJOperatorSchema, { params: { id: objectId }, body: { name: 'Updated DJ' } }],
    ['update ticket profile', updateTicketProfileSchema, { params: { id: objectId }, body: { name: 'Updated profile' } }],
    ['scanner stats', scannerStatsSchema, { params: { eventId: objectId } }],
    ['scanner history basic', scannerHistorySchema, { params: { eventId: objectId } }],
    ['scanner history filtering', scannerHistorySchema, { params: { eventId: objectId }, query: { page: '2', limit: '20', status: 'SUCCESS', operator: objectId, search: 'TKT' } }],
  ])('accepts valid payload for %s', (_name, schema, payload) => {
    expectAccepted(schema, payload);
  });

  it.each([
    ['create coupon', createCouponSchema, { body: { discountType: 'fixed' } }],
    ['update coupon', updateCouponSchema, { params: { id: objectId }, body: { unexpected: true } }],
    ['create popup', createPopupSchema, { body: { name: 'Popup', title: '' } }],
    ['update popup', updatePopupSchema, { params: { id: objectId }, body: { triggerDelay: -1 } }],
    ['create refund', createRefundSchema, { body: { bookingId: objectId, paymentId: otherObjectId, amount: 0 } }],
    ['cancel booking zero refund', cancelBookingSchema, { params: { id: objectId }, body: { refundAmount: 0 } }],
    ['cancel booking negative refund', cancelBookingSchema, { params: { id: objectId }, body: { refundAmount: -50 } }],
    ['process refund', processRefundSchema, { params: { id: objectId }, body: { adminNotes: 'Missing action' } }],
    ['scanner scan', scannerScanSchema, { body: { ticketId: '', eventId: objectId } }],
    ['create category', createCategorySchema, { body: { name: '' } }],
    ['update category', updateCategorySchema, { params: { id: objectId }, body: {} }],
    ['create tier', createTierSchema, { body: { name: 'VIP', color: 'gold' } }],
    ['update tier', updateTierSchema, { params: { id: objectId }, body: { name: '' } }],
    ['scanner stats no eventId', scannerStatsSchema, { params: {} }],
    ['scanner history bad query field', scannerHistorySchema, { params: { eventId: objectId }, query: { unexpected: 'field' } }],
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
    ['update event param', updateEventSchema, { params: { id: 'not-an-object-id' }, body: { title: 'Updated', eventVersion: 1 } }],
    ['update DJ operator param', updateDJOperatorSchema, { params: { id: 'not-an-object-id' }, body: { name: 'Updated' } }],
    ['update ticket profile param', updateTicketProfileSchema, { params: { id: 'not-an-object-id' }, body: { name: 'Updated' } }],
    ['refund booking id', createRefundSchema, { body: { bookingId: 'bad', paymentId: otherObjectId, amount: 100 } }],
    ['scanner event id', scannerScanSchema, { body: { ticketId: 'TKT-001', eventId: 'bad' } }],
    ['scanner stats event id', scannerStatsSchema, { params: { eventId: 'bad' } }],
    ['scanner history event id', scannerHistorySchema, { params: { eventId: 'bad' } }],
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

describe('admin booking identifier param validation schema', () => {
  it.each([
    ['ObjectId', objectId],
    ['booking reference', 'MAD-2026-ABCDE'],
  ])('accepts %s booking identifiers', (_name, id) => {
    expectAccepted(adminBookingIdentifierParamSchema, { params: { id } });
  });

  it.each([
    ['malformed ObjectId', 'not-an-object-id'],
    ['malformed booking reference', 'MAD-26-ABCDE'],
  ])('rejects %s', (_name, id) => {
    expectRejected(adminBookingIdentifierParamSchema, { params: { id } });
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

describe('event image validations', () => {
  const validEventBody = {
    title: 'Test Event',
    slug: 'test-event',
    description: 'Test Description',
    category: 'Concert',
    bookingMode: 'general_admission',
    bannerImage: { url: 'https://example.com/banner.jpg', publicId: 'banner1', hash: 'hash1' },
    startDate: '2026-06-01T00:00:00.000Z',
    venue: 'Test Venue',
    totalCapacity: 100,
  };

  it('accepts event with 1 image (just banner)', () => {
    expectAccepted(createEventSchema, {
      body: {
        ...validEventBody,
      },
    });
  });

  it('accepts update event payload with eventVersion', () => {
    expectAccepted(updateEventSchema, {
      params: { id: objectId },
      body: {
        title: 'Updated event',
        eventVersion: 1,
      },
    });
  });

  it('rejects update event payload without eventVersion', () => {
    expectRejected(updateEventSchema, {
      params: { id: objectId },
      body: {
        title: 'Updated event',
      },
    });
  });



  it('rejects event with duplicate publicId', () => {
    expectRejected(createEventSchema, {
      body: {
        ...validEventBody,
        posterImage: { url: 'https://example.com/poster.jpg', publicId: 'banner1', hash: 'hash_poster' }, // same publicId as bannerImage
      },
    });
  });

  describe('Ticket Tier Validation Schema Tests', () => {
    it('accepts correct tier values', () => {
      expectAccepted(createTierSchema, {
        body: {
          name: 'VIP Standard',
          color: '#6366F1',
          icon: 'star',
          description: 'Access to front rows',
          isActive: true,
          defaultVisibility: true,
          sortIndex: 3,
        },
      });
    });

    it('rejects invalid hex colors', () => {
      expectRejected(createTierSchema, {
        body: {
          name: 'VIP Standard',
          color: 'indigo-500', // Invalid HEX format
        },
      });

      expectRejected(createTierSchema, {
        body: {
          name: 'VIP Standard',
          color: '#GGG111', // Invalid HEX characters
        },
      });
    });

    it('rejects invalid icon choices', () => {
      expectRejected(createTierSchema, {
        body: {
          name: 'VIP Standard',
          icon: 'not-in-enum-allowlist', // Invalid icon type
        },
      });
    });
  });
});
