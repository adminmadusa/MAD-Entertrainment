/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CouponForm } from './CouponForm';

const events = [
  {
    _id: 'evt_1',
    title: 'Neon Night',
    slug: 'neon-night',
    description: '',
    category: 'concert',
    mode: 'general',
    status: 'published',
    venue: 'Arena',
    startDate: '2026-01-01T10:00:00.000Z',
    ticketTiers: [],
    totalCapacity: 100,
    isFeatured: false,
    isAgeRestricted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
] as any;

describe('CouponForm integration', () => {
  const byId = (id: string) => {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!element) throw new Error(`Missing element with id ${id}`);
    return element;
  };

  it('renders sections and supports discount type switching behavior', async () => {
    const user = userEvent.setup();

    render(
      React.createElement(CouponForm, {
        mode: 'create',
        events,
        isLoadingEvents: false,
        isSubmitting: false,
        serverError: '',
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      })
    );

    expect(screen.getByText('General Details')).toBeTruthy();
    expect(screen.getByText('Discount Configuration')).toBeTruthy();
    expect(screen.getByText('Usage Rules')).toBeTruthy();
    expect(screen.getByText('Validity Window')).toBeTruthy();
    expect(screen.getByText('Targeting Filters (Optional)')).toBeTruthy();

    const maxDiscountInput = byId('coupon-max-discount') as HTMLInputElement;
    expect(maxDiscountInput.disabled).toBe(false);

    await user.selectOptions(byId('coupon-discount-type'), 'fixed');
    expect(maxDiscountInput.disabled).toBe(true);

    await user.selectOptions(byId('coupon-discount-type'), 'percentage');
    expect(maxDiscountInput.disabled).toBe(false);
  });

  it('shows scheduling validation error for invalid validity range', async () => {
    const user = userEvent.setup();

    render(
      React.createElement(CouponForm, {
        mode: 'create',
        events,
        isLoadingEvents: false,
        isSubmitting: false,
        serverError: '',
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      })
    );

    await user.type(byId('coupon-code'), 'SAVE20');
    await user.type(byId('coupon-discount-value'), '20');
    await user.type(byId('coupon-valid-from'), '2026-10-11T10:00');
    await user.type(byId('coupon-valid-until'), '2026-10-10T10:00');

    await user.click(screen.getByRole('button', { name: 'Create Coupon' }));

    expect(await screen.findByText('End date must be after or equal to start date.')).toBeTruthy();
  });

  it('submits normalized targeting and code payload', async () => {
    const user = userEvent.setup();
    const onSubmitPayload = vi.fn<(payload: unknown) => Promise<void>>(async () => undefined);

    render(
      React.createElement(CouponForm, {
        mode: 'create',
        events,
        isLoadingEvents: false,
        isSubmitting: false,
        serverError: '',
        onBack: () => undefined,
        onSubmitPayload,
      })
    );

    await user.type(byId('coupon-code'), ' save20 ');
    await user.type(byId('coupon-discount-value'), '20');
    await user.type(byId('coupon-valid-from'), '2026-10-10T10:00');
    await user.type(byId('coupon-valid-until'), '2026-10-11T10:00');

    await user.click(screen.getByRole('button', { name: 'Concert' }));
    await user.click(screen.getByText('Neon Night'));

    await user.click(screen.getByRole('button', { name: 'Create Coupon' }));

    await waitFor(() => expect(onSubmitPayload).toHaveBeenCalledTimes(1));
    const firstCall = onSubmitPayload.mock.calls[0];
    expect(firstCall).toBeTruthy();
    const payload = firstCall?.[0] as Record<string, unknown>;

    expect(payload.code).toBe('SAVE20');
    expect(payload.applicableCategories).toEqual(['concert']);
    expect(payload.applicableEventIds).toEqual(['evt_1']);
    expect(typeof payload.validFrom).toBe('string');
    expect(typeof payload.validUntil).toBe('string');
  });

  it('shows pending submit label when submitting', () => {
    render(
      React.createElement(CouponForm, {
        mode: 'create',
        events,
        isLoadingEvents: false,
        isSubmitting: true,
        serverError: '',
        onBack: () => undefined,
        onSubmitPayload: async () => undefined,
      })
    );

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeTruthy();
  });
});
