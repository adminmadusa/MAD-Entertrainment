import { describe, it, expect } from 'vitest';
import { EventStatus, BookingMode } from '@mad/shared';
import {
  buildEventFormPayload,
  normalizeInitialEventForm,
  validateEventFormStep,
  validateEventFormAll,
  type BuildEventPayloadParams,
} from './event-form.utils';

describe('event-form.utils', () => {
  const baseParams: BuildEventPayloadParams = {
    title: 'Summer Music Fest',
    description: 'Annual summer music festival',
    category: 'concert',
    status: EventStatus.PUBLISHED,
    bannerImage: { url: 'https://example.com/banner.jpg', publicId: 'banner-1' },
    posterImage: null,
    galleryImages: [],
    venue: 'Madison Square Garden',
    startDate: '2026-08-30T18:00:00.000Z',
    endDate: '2026-08-30T23:00:00.000Z',
    bookingStartDate: '2026-08-01T00:00:00.000Z',
    bookingEndDate: '2026-08-30T17:00:00.000Z',
    requireTerms: true,
    requireAgeConfirmation: false,
    ageRestriction: 18,
    tags: 'music, outdoor',
    highlightsInput: 'Live DJ, Food Stalls',
    refundPolicy: 'No refunds',
    organizerName: 'MAD USA',
    countryCode: 'US',
    convenienceFee: '',
    taxPercentage: '',
    ticketingType: 'custom',
    selectedProfileId: '',
    overrides: {},
    tiers: [{ name: 'general', price: 50, capacity: 200 }],
  };

  describe('buildEventFormPayload', () => {
    it('resolves US localization defaults when taxPercentage and convenienceFee are empty', () => {
      const payload = buildEventFormPayload(baseParams);

      expect(payload.countryCode).toBe('US');
      expect(payload.currency).toBe('USD');
      expect(payload.taxLabel).toBe('Sales Tax');
      expect(payload.taxPercentage).toBe(0);
      expect(payload.convenienceFee).toBeUndefined();
      expect(payload.bookingMode).toBe(BookingMode.GENERAL_ADMISSION);
      expect(payload.totalCapacity).toBe(200);
    });

    it('resolves India localization defaults when countryCode is IN', () => {
      const payload = buildEventFormPayload({
        ...baseParams,
        countryCode: 'IN',
      });

      expect(payload.countryCode).toBe('IN');
      expect(payload.currency).toBe('INR');
      expect(payload.taxLabel).toBe('GST');
      expect(payload.taxPercentage).toBe(18);
      expect(payload.locale).toBe('en-IN');
    });

    it('allows custom taxPercentage override', () => {
      const payload = buildEventFormPayload({
        ...baseParams,
        taxPercentage: 8.25,
      });

      expect(payload.taxPercentage).toBe(8.25);
    });

    it('preserves explicit convenienceFee of 0', () => {
      const payload = buildEventFormPayload({
        ...baseParams,
        convenienceFee: 0,
      });

      expect(payload.convenienceFee).toBe(0);
    });

    it('preserves positive convenienceFee', () => {
      const payload = buildEventFormPayload({
        ...baseParams,
        convenienceFee: 5.5,
      });

      expect(payload.convenienceFee).toBe(5.5);
    });
  });

  describe('normalizeInitialEventForm', () => {
    it('normalizes empty initial values to defaults', () => {
      const form = normalizeInitialEventForm({});
      expect(form.countryCode).toBe('US');
      expect(form.title).toBe('');
      expect(form.convenienceFee).toBe(' ');
      expect(form.taxPercentage).toBe(' ');
    });

    it('normalizes existing event tax and convenience fee', () => {
      const form = normalizeInitialEventForm({
        countryCode: 'IN',
        taxPercentage: 12,
        convenienceFee: 25,
      });
      expect(form.countryCode).toBe('IN');
      expect(form.taxPercentage).toBe(12);
      expect(form.convenienceFee).toBe(25);
    });
  });

  describe('validation helpers', () => {
    const validState = {
      title: 'Festival',
      description: 'Big festival',
      venue: 'Main Arena',
      startDate: '2026-09-01T20:00:00Z',
      ticketingType: 'custom' as const,
      selectedProfileId: '',
      bannerImage: { url: 'https://example.com/banner.jpg', publicId: 'b-1' },
    };

    it('validates each step individually', () => {
      expect(validateEventFormStep(0, validState).valid).toBe(true);
      expect(validateEventFormStep(0, { ...validState, title: '' }).valid).toBe(false);
      expect(validateEventFormStep(1, validState).valid).toBe(true);
      expect(validateEventFormStep(1, { ...validState, startDate: '' }).valid).toBe(false);
      expect(validateEventFormStep(3, validState).valid).toBe(true);
      expect(validateEventFormStep(3, { ...validState, bannerImage: null }).valid).toBe(false);
    });

    it('validates all steps together', () => {
      expect(validateEventFormAll(validState).valid).toBe(true);
      expect(validateEventFormAll({ ...validState, venue: '' }).valid).toBe(false);
    });
  });
});
