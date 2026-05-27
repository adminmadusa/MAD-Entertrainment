import { describe, expect, it } from 'vitest';

import { ticketProfileFormSchema } from './ticket-profile-form.schema';

const validValues = {
  name: 'Standard Profile',
  description: 'Default profile',
  groups: [
    {
      name: 'General Passes',
      slug: 'general-passes',
      description: '',
      tickets: [
        {
          tier: 'general',
          name: 'General Admission',
          description: '',
          price: 999,
          isFree: false,
          totalCapacity: 100,
          minPerBooking: 1,
          maxPerBooking: 10,
          groupSize: 1,
          discountType: 'none',
          discountValue: '',
          minQtyRequired: 1,
          buyQty: '',
          freeTicketQty: '',
          isActive: true,
        },
      ],
    },
  ],
};

describe('ticketProfileFormSchema', () => {
  it('accepts valid values', () => {
    expect(ticketProfileFormSchema.safeParse(validValues).success).toBe(true);
  });

  it('rejects empty profile name', () => {
    expect(ticketProfileFormSchema.safeParse({ ...validValues, name: '  ' }).success).toBe(false);
  });

  it('rejects groups with no tickets', () => {
    expect(ticketProfileFormSchema.safeParse({ ...validValues, groups: [{ ...validValues.groups[0], tickets: [] }] }).success).toBe(false);
  });
});
